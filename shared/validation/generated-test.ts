import { test as base, expect } from '@playwright/test';
import {
  guardApiRequest,
  guardBrowser,
  guardBrowserFactories
} from './origin-policy';
import { loadAppConfig } from '../utils/app-config';
export { expect };
export const test = base.extend<{ _originGuard: void }>({
  _originGuard: [
    async ({ page, context, request, baseURL, browser }, use, testInfo) => {
      if (!baseURL)
        throw new Error(
          'Generated tests require a configured application baseURL'
        );
      const app =
        process.env.QA_APP ||
        (testInfo.project.name === 'generated-fixture'
          ? 'saucedemo'
          : testInfo.project.name);
      const config = loadAppConfig(app);
      if (new URL(baseURL).origin !== new URL(config.baseUrl).origin)
        throw new Error(
          'Generated baseURL differs from application configuration'
        );
      const violations: string[] = [];
      guardApiRequest(
        context.request,
        baseURL,
        config.exploration.allowedOrigins,
        violations
      );
      guardApiRequest(
        request,
        baseURL,
        config.exploration.allowedOrigins,
        violations
      );
      const cleanup = await guardBrowser(
        page,
        context,
        baseURL,
        config.exploration.allowedOrigins,
        violations
      );
      const restoreFactories = guardBrowserFactories(browser, violations);
      try {
        await use();
      } finally {
        try {
          await context.close();
        } finally {
          await cleanup().catch(() => {});
          restoreFactories();
        }
        if (violations.length) throw new Error(violations.join('\n'));
      }
    },
    { auto: true }
  ]
});
// Members that register suite hooks, derive new test objects, or alter timeouts
// and skipping are replaced with sealed functions that throw. This holds however
// the property is reached (enumeration, aliasing, computed or concatenated keys),
// independently of the static audit, and because test.extend is sealed no
// derived test object with live members can be obtained from this export.
function seal(target: object, prefix: string, names: readonly string[]) {
  for (const name of names)
    Object.defineProperty(target, name, {
      value: () => {
        throw new Error(
          'Generated tests cannot use ' +
            prefix +
            name +
            '; use the test body or beforeEach/afterEach'
        );
      },
      writable: false,
      configurable: false,
      enumerable: true
    });
}
seal(test, 'test.', [
  'beforeAll',
  'afterAll',
  'extend',
  'use',
  'slow',
  'setTimeout',
  'only',
  'skip',
  'fixme',
  'fail'
]);
seal(test.describe, 'test.describe.', ['configure', 'only', 'skip', 'fixme']);
