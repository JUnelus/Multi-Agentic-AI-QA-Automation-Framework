import type { APIRequestContext, BrowserContext, Page } from '@playwright/test';
export function assertAllowedUrl(
  value: string,
  baseURL: string,
  additional: string[] = []
): string {
  const url = new URL(value, baseURL);
  const origins = new Set(
    [baseURL, ...additional].map((u) => new URL(u).origin)
  );
  if (!['http:', 'https:'].includes(url.protocol) || !origins.has(url.origin))
    throw new Error('Generated origin isolation blocked URL: ' + url.href);
  return url.href;
}
export function guardApiRequest(
  request: APIRequestContext,
  baseURL: string,
  additional: string[],
  violations: string[]
): void {
  const fetch = request.fetch.bind(request);
  const guarded: typeof request.fetch = async (urlOrRequest, options = {}) => {
    let url =
      typeof urlOrRequest === 'string' ? urlOrRequest : urlOrRequest.url();
    let opts = { ...options, maxRedirects: 0 };
    // Request objects can carry body/header semantics; use explicit URLs/options instead.
    if (typeof urlOrRequest !== 'string')
      throw new Error('Generated API requests require a URL string');
    for (let redirect = 0; redirect <= 10; redirect++) {
      try {
        url = assertAllowedUrl(url, baseURL, additional);
      } catch (error) {
        violations.push(String(error));
        throw error;
      }
      const response = await fetch(url, opts);
      const location = response.headers()['location'];
      if (![301, 302, 303, 307, 308].includes(response.status()) || !location)
        return response;
      const status = response.status();
      await response.dispose();
      url = new URL(location, url).href;
      if (
        status === 303 ||
        ([301, 302].includes(status) && opts.method?.toUpperCase() === 'POST')
      )
        opts = {
          ...opts,
          method: 'GET',
          data: undefined,
          form: undefined,
          multipart: undefined
        };
      // Headers/cookies must not be forwarded between allowed origins implicitly.
      if (new URL(url).origin !== new URL(baseURL).origin && opts.headers)
        throw new Error(
          'Cross-origin API redirects with explicit headers require a separate request'
        );
    }
    throw new Error('Generated API request exceeded redirect limit');
  };
  Object.defineProperty(request, 'fetch', {
    value: guarded,
    configurable: true
  });
  for (const method of [
    'get',
    'post',
    'put',
    'patch',
    'delete',
    'head'
  ] as const)
    Object.defineProperty(request, method, {
      value: (url: string, options: Parameters<typeof request.fetch>[1]) =>
        guarded(url, { ...options, method: method.toUpperCase() }),
      configurable: true
    });
}
export async function guardBrowser(
  page: Page,
  context: BrowserContext,
  baseURL: string,
  additional: string[],
  violations: string[]
): Promise<() => Promise<void>> {
  const permitted = (url: string) => {
    try {
      assertAllowedUrl(url, baseURL, additional);
      return true;
    } catch (error) {
      violations.push(String(error));
      return false;
    }
  };
  const goto = page.goto.bind(page);
  page.goto = (url, options) => {
    try {
      assertAllowedUrl(url, baseURL, additional);
    } catch (error) {
      violations.push(String(error));
      return Promise.reject(error);
    }
    return goto(url, options);
  };
  // Route the first request, including popup requests. CDP also checks every redirect hop.
  await context.route('**/*', (route) => {
    if (
      route.request().isNavigationRequest() &&
      route.request().frame().page() !== page
    ) {
      violations.push(
        'Generated execution blocks popup navigation: ' + route.request().url()
      );
      return route.abort('blockedbyclient');
    }
    return permitted(route.request().url())
      ? route.continue()
      : route.abort('blockedbyclient');
  });
  await context.routeWebSocket('**/*', (socket) => {
    violations.push(
      'Generated origin isolation blocks WebSocket: ' + socket.url()
    );
    socket.close();
  });
  const session = await context.newCDPSession(page);
  await session.send('Fetch.enable', {
    patterns: [{ requestStage: 'Request' }]
  });
  session.on('Fetch.requestPaused', (event) => {
    const operation = permitted(event.request.url)
      ? session.send('Fetch.continueRequest', { requestId: event.requestId })
      : session.send('Fetch.failRequest', {
          requestId: event.requestId,
          errorReason: 'BlockedByClient'
        });
    void operation.catch(() => {});
  });
  // Additional tabs are outside this bounded single-page execution model.
  const closePopup = (popup: Page) => {
    violations.push('Generated execution does not allow additional pages');
    void popup.close().catch(() => {});
  };
  context.on('page', closePopup);
  return async () => {
    context.off('page', closePopup);
    await session.detach();
  };
}
