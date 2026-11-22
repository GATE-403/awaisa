import { expect, test } from '@playwright/test'
import { adminPhone, signInViaApi } from './account'

test.describe('«Что нового»', () => {
  test('the page lists what changed, newest first, without catalog chrome', async ({ page }) => {
    await page.goto('/updates')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Что нового/)
    const days = page.getByRole('main').getByRole('heading', { level: 2 })
    await expect(days.first()).toBeVisible()
    expect(await days.count()).toBeGreaterThan(1)
    await expect(page.getByRole('main').getByRole('heading', { level: 3 }).first()).toBeVisible()
    // An info page: the slim header, no catalog search.
    await expect(page.getByRole('searchbox')).toHaveCount(0)
  })

  test('the cabinet marks news until it is read', async ({ page }, testInfo) => {
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    await page.goto('/manage/awaisa-studio')
    const unread = page.getByRole('link', { name: 'Что нового: есть обновления' })
    await expect(unread).toBeVisible()

    await unread.click()
    await expect(page).toHaveURL(/\/updates$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Что нового/)

    await page.goto('/manage/awaisa-studio')
    await expect(page.getByRole('link', { name: 'Что нового', exact: true })).toBeVisible()
  })
})
