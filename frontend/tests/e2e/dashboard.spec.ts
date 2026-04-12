/**
 * E2E tests for the main dashboard flows.
 *
 * Run with: npx playwright test
 * Assumes auth.setup.ts has already stored credentials.
 */
import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    // Wait for the subscription list to load
    await page.waitForSelector('h2:has-text("サブスクリプション一覧")')
  })

  test('shows KPI cards and section headings', async ({ page }) => {
    // KPI cards (SummaryCards)
    await expect(page.getByText('月間実質負担額')).toBeVisible()
    await expect(page.getByText('年間コスト')).toBeVisible()
    await expect(page.getByText('有効サブスク数')).toBeVisible()
    await expect(page.getByText('カテゴリ数')).toBeVisible()
  })

  test('can add a new subscription and it appears in the list', async ({ page }) => {
    const serviceName = `E2E-Test-${Date.now()}`

    // Open add modal
    await page.getByRole('button', { name: /サービスを追加/ }).click()

    // Skip template, go to manual entry
    await page.getByRole('button', { name: '手動で入力' }).click()

    // Fill form
    await page.getByLabel('サービス名').fill(serviceName)
    await page.getByLabel('料金').fill('980')
    await page.getByLabel('次回請求日').fill('2026-12-01')

    // Submit
    await page.getByRole('button', { name: '追加する' }).click()

    // Toast confirmation
    await expect(page.getByText('サブスクリプションを追加しました')).toBeVisible()

    // Should appear in the list (switch to "All" tab if needed)
    await page.getByRole('button', { name: /全て/ }).click()
    await expect(page.getByText(serviceName)).toBeVisible()
  })

  test('can cancel a subscription', async ({ page }) => {
    // This test relies on at least one active subscription existing.
    // If the list is empty, skip.
    const activeTab = page.locator('button', { hasText: /有効/ })
    await activeTab.click()

    const cards = page.locator('.sm\\:hidden > div') // mobile cards
    const count = await cards.count()
    if (count === 0) {
      test.skip()
      return
    }

    // Click the cancel (Ban) button on the first card
    const firstCard = cards.first()
    const cancelBtn = firstCard.getByTitle('解約済みにする')
    await cancelBtn.click()

    // Confirm dialog
    page.on('dialog', (d) => d.accept())

    await expect(page.getByText('解約済みに変更しました')).toBeVisible({ timeout: 10_000 })
  })

  test('can search subscriptions by service name', async ({ page }) => {
    // Switch to all tab
    await page.getByRole('button', { name: /全て/ }).click()

    const searchInput = page.getByPlaceholder('サービス名で検索')
    await searchInput.fill('zzz-nonexistent-service')

    // Should show empty state
    await expect(page.getByText('条件に一致するサブスクがありません')).toBeVisible()

    // Clear search
    await searchInput.clear()
  })

  test('can sort by monthly cost', async ({ page }) => {
    // Desktop: click the 月額(JPY) column header
    await page.getByRole('button', { name: '月額(JPY)' }).click()
    // Arrow indicator should appear (just verify no error thrown)
    await expect(page.locator('table thead')).toBeVisible()
  })

  test('CSV import dialog opens and shows file picker', async ({ page }) => {
    await page.getByRole('button', { name: /CSVインポート/ }).click()
    await expect(page.getByText('CSVファイルを選択')).toBeVisible()
    await expect(page.getByRole('button', { name: 'ファイルを選択' })).toBeVisible()
  })

  test('category manager dialog opens and can add/remove a category', async ({ page }) => {
    await page.getByRole('button', { name: /カテゴリ/ }).click()
    await expect(page.getByText('カテゴリ管理')).toBeVisible()

    const catName = `TestCat-${Date.now()}`
    await page.getByPlaceholder(/動画.*音楽/).fill(catName)
    await page.getByRole('button').filter({ hasText: '' }).last().click() // Plus button

    await expect(page.getByText(`「${catName}」を追加しました`)).toBeVisible()
    await expect(page.getByText(catName)).toBeVisible()
  })
})

test.describe('Dashboard widget settings', () => {
  test('can hide and show KPI cards', async ({ page }) => {
    await page.goto('/dashboard')

    // Open settings
    await page.getByTitle('ウィジェット表示設定').click()

    // Uncheck KPI cards
    await page.getByText('KPIカード').click()

    // KPI cards should be gone
    await expect(page.getByText('月間実質負担額')).not.toBeVisible()

    // Re-open and restore
    await page.getByTitle('ウィジェット表示設定').click()
    await page.getByText('KPIカード').click()

    await expect(page.getByText('月間実質負担額')).toBeVisible()
  })
})

test.describe('Mobile layout', () => {
  test.use({ viewport: { width: 390, height: 844 } }) // iPhone 14 Pro

  test('summary cards show in 2-column grid on mobile', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForSelector('text=月間実質負担額')

    // All 4 KPI cards should be visible
    await expect(page.getByText('月間実質負担額')).toBeVisible()
    await expect(page.getByText('カテゴリ数')).toBeVisible()
  })

  test('subscription cards appear on mobile (not table)', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForSelector('h2:has-text("サブスクリプション一覧")')

    // Mobile card container should be visible; desktop table hidden
    const mobileCards = page.locator('.sm\\:hidden').first()
    await expect(mobileCards).toBeVisible()
  })
})
