import { expect, test } from '@playwright/test'
import { adminPhone, randomClientPhone, signInViaApi } from './account'
import { createVisit } from './business'

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
    await page.getByLabel("Administrator's phone").fill(phone.replace('+996', ''))
    await page.getByRole('button', { name: 'Add' }).click()
    await expect(page.getByText('Administrator added')).toBeVisible()

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
      // The studio has no seeded visits: one past visit gives the base a client who paid.
      const business = await (await staff.request.get(`/api/businesses/${SLUG}`)).json()
      const visit = await createVisit({
        slug: SLUG,
        serviceId: business.catalog.services[0].id,
        specialistId: 'any',
        daysBack: 2,
      })
      const clients = await (
        await staff.request.get(
          `/api/manage/${SLUG}/clients?sort=spent&q=${encodeURIComponent(visit.phone.slice(-6))}`,
        )
      ).json()
      expect(clients.items.length).toBeGreaterThan(0)
      expect(clients.items.every((client: { spent: unknown }) => client.spent === null)).toBe(true)
      const card = await (
        await staff.request.get(
          `/api/manage/${SLUG}/clients/${encodeURIComponent(clients.items[0].phone)}`,
        )
      ).json()
      expect(card.stats.spent).toBeNull()
      expect(card.stats.averageCheck).toBeNull()
      const ownerClients = await (
        await page.request.get(
          `/api/manage/${SLUG}/clients?q=${encodeURIComponent(visit.phone.slice(-6))}`,
        )
      ).json()
      expect(ownerClients.items[0].spent).toBeGreaterThan(0)

      await staff.goto(`/manage/${SLUG}?tab=analytics`)
      const tabs = staff.getByRole('navigation', { name: 'Dashboard sections' })
      await expect(tabs.getByRole('link', { name: 'Schedule' })).toBeVisible()
      await expect(tabs.getByRole('link', { name: 'Till' })).toBeVisible()
      await expect(tabs.getByRole('link', { name: 'Analytics' })).toHaveCount(0)
      await expect(tabs.getByRole('link', { name: 'Settings' })).toHaveCount(0)

      // The owner closes the door.
      await page.reload()
      await page
        .getByRole('button', { name: /^Remove access:/ })
        .last()
        .click()
      await expect(page.getByText('Access removed')).toBeVisible()
      expect((await staff.request.get(`/api/manage/${SLUG}/schedule?date=${today}`)).status()).toBe(
        403,
      )
    } finally {
      await staffContext.close()
    }
  })
})
