import { expect, test } from '@playwright/test'
import { adminPhone, randomClientPhone, signInViaApi } from './account'
import { createPastVisit, withDb } from './visits'

const SLUG = 'awaisa-studio'

test.describe('Mailings', () => {
  test('the owner previews “lapsed” clients, sends once a day, turns birthday greetings on', async ({
    page,
    isMobile,
  }, testInfo) => {
    test.skip(isMobile, 'Runs once: a mailing is limited to one a day')
    test.setTimeout(90_000)
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    const manage = `/api/manage/${SLUG}`
    // A client last seen four months ago.
    const { booking } = await createPastVisit('E2E Рассылка', randomClientPhone(), 0, 120)
    // Mailings reach only clients who kept SMS on; the helper books with SMS off.
    await withDb((client) =>
      client.query('UPDATE "bookings" SET "sms_confirmation" = true WHERE "id" = $1', [booking.id]),
    )
    // Earlier runs today must not block this one.
    await withDb((client) =>
      client.query(
        `DELETE FROM "mailings" WHERE "segment" = 'lapsed'
           AND "business_id" = (SELECT "id" FROM "businesses" WHERE "slug" = $1)`,
        [SLUG],
      ),
    )
    const before = await (await page.request.get(`${manage}/mailings`)).json()

    try {
      const preview = await (
        await page.request.get(`${manage}/mailings/preview?segment=lapsed&days=90`)
      ).json()
      expect(preview.count).toBeGreaterThan(0)

      await page.goto(`/manage/${SLUG}?tab=clients`)
      await page.getByRole('button', { name: 'Mailing' }).click()
      const sheet = page.getByRole('dialog', { name: 'Mailing' })
      await sheet.getByRole('combobox', { name: 'Not seen for longer than' }).click()
      await page.getByRole('option', { name: '90 days' }).click()
      await expect(sheet.getByText(/\d+ clients?$/)).toBeVisible()
      await sheet.getByLabel('Mailing text').fill('E2E {name}, long time no see: {link}')
      await sheet.getByRole('button', { name: 'Send' }).click()
      await expect(page.getByText(/^Sent to \d+ clients?/)).toBeVisible()

      // The same segment cannot go out twice a day.
      const again = await page.request.post(`${manage}/mailings`, {
        data: { segment: 'lapsed', days: 90, text: 'E2E {name}, once more' },
      })
      expect(again.status()).toBe(409)

      // Birthday greetings switch on and off.
      await page.request.put(`${manage}/mailings/birthday`, {
        data: { text: 'E2E {name}, happy birthday! {link}' },
      })
      expect(
        (await (await page.request.get(`${manage}/mailings`)).json()).birthdayGreeting,
      ).toContain('happy birthday')
    } finally {
      await page.request.put(`${manage}/mailings/birthday`, {
        data: { text: before.birthdayGreeting ?? null },
      })
    }
  })
})
