import { expect, test } from '@playwright/test'
import { adminPhone, formatPhone, randomClientPhone, signInViaApi } from './account'
import { createFutureVisit, createPastVisit } from './visits'

const SLUG = 'awaisa-studio'

test.describe('Visit outcomes and the client base', () => {
  test('staff mark a visit paid and a no-show; the client card adds it up and keeps a note', async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000)
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    const phone = randomClientPhone()
    const name = `E2E Клиент ${testInfo.project.name}`
    const paid = await createPastVisit(name, phone)
    const missed = await createPastVisit(name, phone)

    const arrived = await page.request.patch(
      `/api/manage/${SLUG}/bookings/${paid.booking.id}/outcome`,
      {
        data: { outcome: 'arrived', paidAmount: 1234, paymentMethod: 'card' },
      },
    )
    expect(await arrived.json()).toMatchObject({
      outcome: 'arrived',
      paidAmount: 1234,
      paymentMethod: 'card',
    })
    await page.request.patch(`/api/manage/${SLUG}/bookings/${missed.booking.id}/outcome`, {
      data: { outcome: 'no_show' },
    })

    const card = await (
      await page.request.get(`/api/manage/${SLUG}/clients/${encodeURIComponent(phone)}`)
    ).json()
    expect(card.stats).toMatchObject({ visits: 1, noShows: 1, spent: 1234 })

    // A visit that has not come yet cannot be closed.
    const future = await createFutureVisit(name, phone)
    const early = await page.request.patch(
      `/api/manage/${SLUG}/bookings/${future.booking.id}/outcome`,
      {
        data: { outcome: 'arrived' },
      },
    )
    expect(early.status()).toBe(400)

    await page.goto(`/manage/${SLUG}?tab=clients`)
    await page.getByLabel('Поиск клиента').fill(phone.slice(-7))
    const row = page.getByRole('button', { name: new RegExp(name) })
    await expect(row).toContainText('1 неявка')
    await row.click()

    const sheet = page.getByRole('dialog', { name: 'Клиент' })
    await expect(sheet).toContainText(formatPhone(phone))
    await expect(sheet).toContainText('Не пришёл 1 раз')
    await expect(sheet).toContainText('1 234 сом, карта')
    await sheet.getByLabel('Заметка о клиенте').fill('E2E любит кофе без сахара')
    await sheet.getByRole('button', { name: 'Сохранить' }).click()
    await expect(page.getByText('Карточка сохранена')).toBeVisible()

    await row.click()
    await expect(
      page.getByRole('dialog', { name: 'Клиент' }).getByLabel('Заметка о клиенте'),
    ).toHaveValue('E2E любит кофе без сахара')
  })
})
