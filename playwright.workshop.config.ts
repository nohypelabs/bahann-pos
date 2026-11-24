import { defineConfig, devices } from '@playwright/test'

// Browser E2E suite for the workshop (bengkel) module. It runs against the workshop
// test tenant on whichever deployment WORKSHOP_E2E_BASE_URL points at (default: a
// local `next dev` on :3123, which uses the database in .env.local). The tests share
// one tenant and change its data, so they run one at a time.
//
//   E2E_EMAIL=you@gmail.com WORKSHOP_TEST_PASSWORD=… pnpm test:e2e:workshop
//
// See e2e/workshop/README.md.
const baseURL = process.env.WORKSHOP_E2E_BASE_URL || 'http://localhost:3123'
const isLocal = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(baseURL)

export default defineConfig({
  testDir: './e2e/workshop',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/workshop', open: 'never' }]],
  globalSetup: './e2e/workshop/global-setup.ts',
  use: {
    baseURL,
    storageState: 'e2e/.auth/workshop.json',
    // The PWA service worker serves stale bundles under `next dev`.
    serviceWorkers: 'block',
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    navigationTimeout: 60_000,
    actionTimeout: 20_000,
  },
  projects: [{
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      // Optional: a system Chromium instead of Playwright's download (e.g. /usr/bin/chromium).
      launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
    },
  }],
  webServer: isLocal
    ? {
        command: `node_modules/.bin/next dev -p ${new URL(baseURL).port || 80}`,
        url: baseURL,
        reuseExistingServer: true,
        timeout: 180_000,
      }
    : undefined,
})
