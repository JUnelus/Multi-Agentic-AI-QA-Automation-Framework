import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import { loadAppConfig } from './shared/utils/app-config';

dotenv.config({ quiet: true });

const targetApp = process.env.TARGET_APP || 'saucedemo';
const appConfig = loadAppConfig(targetApp);

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
    baseURL: appConfig.baseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});


