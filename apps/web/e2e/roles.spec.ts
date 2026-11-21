import { expect, test } from '@playwright/test'
import { adminPhone, randomClientPhone, signInViaApi } from './account'

const SLUG = 'awaisa-studio'

test.describe('Staff roles', () => {
  test('an administrator runs the day but sees no money or settings', async ({
    page,
    browser,
    isMobile,
  }, testInfo) => {
    test.skip(isMobile, 'Runs once: it changes the team')
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    const phone = randomClientPhone()
    const today = new Date().toISOString().slice(0, 10)

    // The owner adds an administrator by phone.
    await page.goto(`/manage/${SLUG}?tab=team`)
    await page.getByLabel('Телефон администратора').fill(phone.replace('+996', ''))
    await page.getByRole('button', { name: 'Добавить' }).click()
    await expect(page.getByText('Администратор добавлен')).toBeVisible()

    const staffContext = await browser.newContext()
    const staff = await staffContext.newPage()
    try {
      await signInViaApi(staff, phone, 'E2E Админ Салона')
      const cabinet = await (await staff.request.get(`/api/manage/${SLUG}`)).json()
      expect(cabinet.role).toBe('staff')
      expect((await staff.request.get(`/api/manage/${SLUG}/schedule?date=${today}`)).status()).toBe(
        200,
      )
      expect((await staff.request.get(`/api/manage/${SLUG}/analytics?days=7`)).status()).toBe(403)
      expect(
        (await staff.request.put(`/api/manage/${SLUG}/hours`, { data: { days: [] } })).status(),
      ).toBe(403)
      expect((await staff.request.get(`/api/manage/${SLUG}/members`)).status()).toBe(403)
      // The counter is the day's work: shifts and sales yes, expenses and the profit no.
      expect((await staff.request.get(`/api/manage/${SLUG}/cash`)).status()).toBe(200)
      expect((await staff.request.get(`/api/manage/${SLUG}/expenses?days=30`)).status()).toBe(403)
      expect((await staff.request.get(`/api/manage/${SLUG}/money?days=30`)).status()).toBe(403)

      await staff.goto(`/manage/${SLUG}?tab=analytics`)
      const tabs = staff.getByRole('navigation', { name: 'Разделы кабинета' })
      await expect(tabs.getByRole('link', { name: 'Расписание' })).toBeVisible()
      await expect(tabs.getByRole('link', { name: 'Касса' })).toBeVisible()
      await expect(tabs.getByRole('link', { name: 'Аналитика' })).toHaveCount(0)
      await expect(tabs.getByRole('link', { name: 'Настройки' })).toHaveCount(0)

      // The owner closes the door.
      await page.reload()
      await page
        .getByRole('button', { name: /^Закрыть доступ:/ })
        .last()
        .click()
      await expect(page.getByText('Доступ закрыт')).toBeVisible()
      expect((await staff.request.get(`/api/manage/${SLUG}/schedule?date=${today}`)).status()).toBe(
        403,
      )
    } finally {
      await staffContext.close()
    }
  })
})
