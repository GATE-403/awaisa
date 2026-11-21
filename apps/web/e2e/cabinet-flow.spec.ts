import { expect, test } from '@playwright/test'
import { adminPhone, signInViaApi } from './account'

test.describe('Way into the cabinet and out of it', () => {
  test('«Кабинет» leads in, «‹» back to where it was opened, the business is a switcher', async ({
    page,
  }, testInfo) => {
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    await page.goto('/map')
    // The tab bar on phones, the header with a mouse: one tap either way.
    await page.getByRole('link', { name: 'Кабинет' }).locator('visible=true').first().click()
    await expect(page).toHaveURL(/\/manage$/)
    // The row in the list itself: right after the move the map's own rows («Awaisa Studio …»,
    // links to booking) may still be on screen and match a looser query.
    await page
      .getByRole('article', { name: 'Awaisa Studio', exact: true })
      .getByRole('link', { name: /Awaisa Studio/ })
      .first()
      .click()
    await expect(page).toHaveURL(/\/manage\/awaisa-studio/)

    // The business opens the rest of the business side.
    await page.getByRole('button', { name: /другие бизнесы и разделы/ }).click()
    const menu = page.getByRole('menu')
    await expect(menu.getByRole('menuitem', { name: 'Воронки' })).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: 'Новая страница' })).toBeVisible()
    await page.keyboard.press('Escape')

    // «‹» leaves the business side for the page it was entered from, never the list again.
    await page.getByRole('link', { name: 'Назад: Карта' }).click()
    await expect(page).toHaveURL(/\/map$/)
  })

  test('the profile glyph leads out to the catalog', async ({ page }, testInfo) => {
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    await page.goto('/manage/awaisa-studio')
    await page.getByRole('button', { name: /^Профиль/ }).click()
    await page.getByRole('menuitem', { name: 'Каталог' }).click()
    await expect(page).toHaveURL(/:\d+\/$/)
  })
})
