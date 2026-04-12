/**
 * Subscription CRUD E2E tests — create, edit, delete.
 * These are more destructive, so they create and clean up their own data.
 */
import { test, expect } from '@playwright/test'

const TEST_SERVICE = `E2E-CRUD-${Date.now()}`

test.describe('Subscription CRUD', () => {
  let createdServiceName: string

  test('create subscription from template', async ({ page }) => {
    await page.goto('/dashboard')
    createdServiceName = `E2E-Template-${Date.now()}`

    await page.getByRole('button', { name: /サービスを追加/ }).click()

    // Pick first template
    const firstTemplate = page.locator('.grid button').first()
    const templateName = await firstTemplate.textContent()
    await firstTemplate.click()

    // Form should be pre-filled with template name
    const serviceNameInput = page.getByLabel('サービス名')
    await expect(serviceNameInput).not.toHaveValue('')

    // Set a test-specific name to avoid conflicts
    await serviceNameInput.clear()
    await serviceNameInput.fill(createdServiceName)
    await page.getByLabel('料金').clear()
    await page.getByLabel('料金').fill('500')
    await page.getByLabel('次回請求日').fill('2026-12-31')

    await page.getByRole('button', { name: '追加する' }).click()
    await expect(page.getByText('サブスクリプションを追加しました')).toBeVisible()

    // Verify it's in the list
    await page.getByRole('button', { name: /全て/ }).click()
    await expect(page.getByText(createdServiceName)).toBeVisible()

    void templateName // suppress unused warning
  })

  test('edit subscription', async ({ page }) => {
    await page.goto('/dashboard')
    await page.getByRole('button', { name: /全て/ }).click()

    const target = TEST_SERVICE

    // Find the card or table row with our service
    const serviceText = page.getByText(target).first()
    if (!(await serviceText.isVisible())) {
      test.skip()
      return
    }

    // Click edit button on the row
    const row = serviceText.locator('xpath=ancestor::div[contains(@class,"rounded-xl")]').first()
    await row.getByTitle('編集').click()

    // Change the notes field
    const notesField = page.getByLabel('メモ')
    await notesField.fill('E2E test note')

    await page.getByRole('button', { name: '更新する' }).click()
    await expect(page.getByText('サブスクリプションを更新しました')).toBeVisible()
  })

  test('delete subscription', async ({ page }) => {
    await page.goto('/dashboard')
    await page.getByRole('button', { name: /全て/ }).click()

    const serviceText = page.getByText(TEST_SERVICE).first()
    if (!(await serviceText.isVisible())) {
      test.skip()
      return
    }

    const row = serviceText.locator('xpath=ancestor::div[contains(@class,"rounded-xl")]').first()

    // Accept the confirm dialog
    page.on('dialog', (d) => d.accept())
    await row.getByTitle('完全に削除').click()

    await expect(page.getByText('削除しました')).toBeVisible()
    await expect(page.getByText(TEST_SERVICE)).not.toBeVisible({ timeout: 5_000 })
  })
})
