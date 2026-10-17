import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: process.env['BASE_URL'] || 'http://127.0.0.1:4200/foundations/',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'portrait', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
    {
      name: 'landscape',
      use: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true },
    },
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
  ],
  webServer: process.env['BASE_URL']
    ? undefined
    : {
        command: 'node scripts/serve.mjs',
        url: 'http://127.0.0.1:4200/foundations/',
        reuseExistingServer: !process.env['CI'],
      },
});
