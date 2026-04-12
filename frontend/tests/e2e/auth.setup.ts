/**
 * Authentication setup — runs once before all tests.
 * Logs in with E2E_EMAIL / E2E_PASSWORD and saves browser storage
 * so other tests start already authenticated.
 */
import { test as setup } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '.auth/user.json')

setup('authenticate', async ({ page }) => {
  const email = process.env.E2E_EMAIL
  const password = process.env.E2E_PASSWORD

  if (!email || !password) {
    throw new Error('Set E2E_EMAIL and E2E_PASSWORD environment variables to run E2E tests')
  }

  await page.goto('/login')

  await page.getByLabel('メールアドレス').fill(email)
  await page.getByLabel('パスワード').fill(password)
  await page.getByRole('button', { name: 'ログイン' }).click()

  // Wait for dashboard redirect
  await page.waitForURL('**/dashboard', { timeout: 15_000 })

  // Save authentication state
  await page.context().storageState({ path: authFile })
})
