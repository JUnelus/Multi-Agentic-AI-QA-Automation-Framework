import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { chromium, request } from '@playwright/test';
import {
  guardApiRequest,
  guardBrowser
} from '../../shared/validation/origin-policy';
test('browser and API guard block external requests and redirects before dispatch', async () => {
  let foreignVisits = 0;
  const foreign = http.createServer((_req, res) => {
    foreignVisits++;
    res.end('foreign');
  });
  await new Promise<void>((resolve) => foreign.listen(0, '127.0.0.1', resolve));
  const foreignUrl =
    'http://127.0.0.1:' +
    (foreign.address() as import('node:net').AddressInfo).port;
  const server = http.createServer((req, res) => {
    if (req.url === '/redirect') {
      res.writeHead(302, { location: foreignUrl });
      res.end();
    } else if (req.url === '/local-redirect') {
      res.writeHead(302, { location: '/' });
      res.end();
    } else {
      res.setHeader('Content-Type', 'text/html');
      res.end('<h1>Allowed</h1>');
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseURL =
    'http://127.0.0.1:' +
    (server.address() as import('node:net').AddressInfo).port;
  const browser = await chromium.launch();
  const context = await browser.newContext({
    baseURL,
    serviceWorkers: 'block'
  });
  const page = await context.newPage();
  const api = await request.newContext({ baseURL });
  const violations: string[] = [];
  const cleanup = await guardBrowser(page, context, baseURL, [], violations);
  guardApiRequest(api, baseURL, [], violations);
  guardApiRequest(context.request, baseURL, [], violations);
  try {
    await page.goto('/');
    await page.goto(baseURL);
    assert.equal(await page.title(), '');
    assert.equal((await api.get('/')).status(), 200);
    assert.equal((await api.get(baseURL + '/local-redirect')).status(), 200);
    await assert.rejects(() => api.get(foreignUrl), /blocked URL/);
    await assert.rejects(() => page.request.get(foreignUrl), /blocked URL/);
    await assert.rejects(() => api.get('/redirect'), /blocked URL/);
    const fetched = await page.evaluate(async (url) => {
      try {
        await fetch(url);
        return true;
      } catch {
        return false;
      }
    }, foreignUrl);
    assert.equal(fetched, false);
    for (const url of [foreignUrl, baseURL + '/redirect']) {
      const isolated = await browser.newContext({
        baseURL,
        serviceWorkers: 'block'
      });
      const p = await isolated.newPage();
      const stop = await guardBrowser(p, isolated, baseURL, [], violations);
      await assert.rejects(() => p.goto(url));
      await stop();
      await isolated.close();
    }
    assert.equal(foreignVisits, 0);
    assert.ok(violations.some((v) => v.includes(foreignUrl)));
    const extra = await request.newContext({ baseURL });
    guardApiRequest(extra, baseURL, [foreignUrl], []);
    assert.equal((await extra.get(foreignUrl)).status(), 200);
    await extra.dispose();
    const allowedContext = await browser.newContext({
      baseURL,
      serviceWorkers: 'block'
    });
    const allowedPage = await allowedContext.newPage();
    const stopAllowed = await guardBrowser(
      allowedPage,
      allowedContext,
      baseURL,
      [foreignUrl],
      []
    );
    await allowedPage.goto(foreignUrl);
    assert.equal(await allowedPage.textContent('body'), 'foreign');
    await stopAllowed();
    await allowedContext.close();
  } finally {
    await cleanup();
    await api.dispose();
    await browser.close();
    await Promise.all([
      new Promise<void>((r) => server.close(() => r())),
      new Promise<void>((r) => foreign.close(() => r()))
    ]);
  }
});
