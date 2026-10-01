import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { loadAppConfig } from './shared/utils/app-config';
const staging = process.env.QA_CODE_DIR;
const app = process.env.QA_APP || 'saucedemo';
export default defineConfig({
  timeout: 30000,
  expect: { timeout: 5000 },
  forbidOnly: true,
  retries: 0,
  workers: 2,
  outputDir: process.env.QA_REPORT_DIR
    ? path.join(process.env.QA_REPORT_DIR, 'traces')
    : 'test-results/generated',
  reporter: [
    ['list'],
    [
      'html',
      {
        outputFolder: process.env.QA_REPORT_DIR
          ? path.join(process.env.QA_REPORT_DIR, 'html')
          : 'playwright-report/generated',
        open: 'never'
      }
    ]
  ],
  use: {
    ...devices['Desktop Chrome'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: staging
    ? [
        {
          name: app,
          testDir: path.join(path.resolve(staging), 'specs'),
          use: { baseURL: loadAppConfig(app).baseUrl }
        }
      ]
    : [
        {
          name: 'generated-fixture',
          testDir: './tests/fixtures/generated/saucedemo/specs',
          use: { baseURL: loadAppConfig('saucedemo').baseUrl }
        },
        {
          name: 'generated-legacy',
          testDir: './generated/specs/saucedemo',
          use: { baseURL: loadAppConfig('saucedemo').baseUrl }
        }
      ]
});
