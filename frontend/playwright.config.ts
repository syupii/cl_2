import { defineConfig, devices } from '@playwright/test'

/**
 * E2E test configuration for サブスク管理ダッシュボード.
 *
 * Run:
 *   npx playwright test
 *
 * Prerequisites:
 *   - App must be running at BASE_URL (default: http://localhost:3000)
 *   - Set env vars:
 *       E2E_EMAIL    - test user email registered in Supabase
 *       E2E_PASSWORD - test user password
 *
 * Install browsers once:
 *   npx playwright install
 */

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // serial so login state can be reused
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 7'],
        storageState: 'tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
})
