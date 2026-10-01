import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import { loadAppConfig } from './shared/utils/app-config';

dotenv.config({ quiet: true });

export default defineConfig({
  testDir: './apps',
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html'], ['list']],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  forbidOnly: true,
  projects: ['saucedemo', 'uitestingplayground'].map(app => ({
    name: app,
    testDir: `./apps/${app}/tests`,
    use: { ...devices['Desktop Chrome'], baseURL: loadAppConfig(app).baseUrl }
  }))
});


