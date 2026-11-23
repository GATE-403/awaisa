import { expect, test } from '@playwright/test'
import { randomClientPhone, signInViaApi } from './account'
import { createOwnBusiness, createVisit } from './business'
import { API_URL } from './helpers'
import { withDb } from './visits'

test.describe('Deleting a business', () => {
  test('the owner hides the page, then deletes the business by holding; staff cannot', async ({
    page,
    browser,
  }) => {
    test.setTimeout(90_000)
    const business = await createOwnBusiness(page)
    const manage = `/api/manage/${business.slug}`
    const visit = await createVisit({
      slug: business.slug,
      serviceId: business.service.id,
      specialistId: business.master.id,
      name: 'E2E Клиент Удаляемого Места',
    })

    // An administrator runs the day but may not delete the business.
    const staffPhone = randomClientPhone()
    expect(
      (await page.request.post(`${manage}/members`, { data: { phone: staffPhone } })).ok(),
    ).toBe(true)
    const staffContext = await browser.newContext()
    const staff = await staffContext.newPage()
    try {
      await signInViaApi(staff, staffPhone, 'E2E Админ Удаляемого Места')
      expect((await staff.request.delete(manage)).status()).toBe(403)
    } finally {
      await staffContext.close()
    }

    // Hiding and deleting live behind a settings row of their own, never in plain view.
    await page.goto(`/manage/${business.slug}?tab=settings`)
    await expect(page.getByRole('button', { name: /Удалить бизнес/ })).toHaveCount(0)
    const businessRow = page.getByRole('button', { name: /Скрыть или удалить/ })
    await expect(businessRow).toContainText('Открыта')
    await businessRow.click()
    const sheet = page.getByRole('dialog', { name: 'Скрыть или удалить' })
    const pageSwitch = sheet.getByRole('switch', { name: 'Страница открыта' })
    await expect(pageSwitch).toBeChecked()

    // Hiding is the reversible step, at the same place.
    await pageSwitch.click()
    await expect(page.getByText('Страница скрыта')).toBeVisible()
    await expect(pageSwitch).not.toBeChecked()
    expect((await page.request.get(`${API_URL}/businesses/${business.slug}`)).status()).toBe(404)
    await pageSwitch.click()
    await expect(pageSwitch).toBeChecked()

    // Held, not confirmed in a dialog.
    await sheet.getByRole('button', { name: /Удалить бизнес/ }).click({ delay: 1300 })
    await expect(page.getByText('Бизнес удалён')).toBeVisible()
    // The owner had no other business: the profile.
    await expect(page).toHaveURL(/\/bookings/)

    expect((await page.request.get(`${API_URL}/businesses/${business.slug}`)).status()).toBe(404)
    expect((await page.request.get(manage)).status()).toBe(404)
    expect(await (await page.request.get('/api/me/businesses')).json()).toEqual([])
    // The address is free to take again.
    const check = await (
      await page.request.get(`/api/businesses/slug-available?slug=${business.slug}`)
    ).json()
    expect(check.available).toBe(true)

    // The client's visit is cancelled the salon's way (the text follows the undo window); the
    // archive keeps it in the books.
    const { rows } = await withDb((client) =>
      client.query(
        `SELECT b."status", b."cancelled_by", bz."deleted_at" IS NOT NULL AS "isDeleted"
         FROM "bookings" b JOIN "businesses" bz ON bz."id" = b."business_id" WHERE b."id" = $1`,
        [visit.id],
      ),
    )
    expect(rows[0]).toEqual({ status: 'cancelled', cancelled_by: 'salon', isDeleted: true })

    await page.goto(`/${business.slug}`)
    await expect(page.getByText('Не нашли.')).toBeVisible()
  })
})
