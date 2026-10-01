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
