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
// and skipping are replaced with sealed functions that throw. The walk covers
// the test object and its nested containers (describe, describe.parallel,
// describe.serial, step), so the seal holds however a member is reached
// (enumeration, aliasing, computed or concatenated keys), independently of the
// static audit. Because extend is sealed no derived test object with live
// members can be obtained from this export.
const sealedControls = new Set([
  'beforeAll',
  'afterAll',
  'extend',
  'use',
  'slow',
  'setTimeout',
  'configure',
  'only',
  'skip',
  'fixme',
  'fail'
]);
const sealedContainers = new Set(['describe', 'parallel', 'serial', 'step']);
export function sealTestControls(target: object, prefix = 'test.'): string[] {
  const sealed: string[] = [];
  for (const name of Object.keys(target)) {
    const member = (target as Record<string, unknown>)[name];
    if (typeof member !== 'function') continue;
    if (sealedControls.has(name)) {
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
      sealed.push(prefix + name);
    } else if (sealedContainers.has(name))
      sealed.push(...sealTestControls(member, prefix + name + '.'));
  }
  return sealed;
}
sealTestControls(test);
