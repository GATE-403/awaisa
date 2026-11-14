import { expect, test } from '@playwright/test'
import { adminPhone, randomClientPhone, signInViaApi } from './account'
import { API_URL } from './helpers'

const SLUG = 'awaisa-studio'

type Slot = { time: string; isAvailable: boolean }

test.describe('Promotions', () => {
  test('happy hours, promo codes and the catalog badge', async ({ page, isMobile }, testInfo) => {
    test.skip(isMobile, 'Runs once: it changes the business’s promotions')
    test.setTimeout(90_000)
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    const business = await (await fetch(`${API_URL}/businesses/${SLUG}`)).json()
    const master = business.catalog.specialists[0]
    const service = business.catalog.services.find((item: { id: string }) =>
      master.serviceIds.includes(item.id),
    )
    const created: string[] = []

    try {
      // The owner adds a promo code from the cabinet sheet.
      await page.goto(`/manage/${SLUG}?tab=promotions`)
      await page.getByRole('button', { name: 'Новая акция' }).first().click()
      const sheet = page.getByRole('dialog', { name: 'Новая акция' })
      await sheet.getByText('Промокод', { exact: true }).click()
      await sheet.getByLabel('Название акции').fill('E2E Промокод')
      await sheet.getByLabel('Скидка, %').fill('30')
      await sheet.getByRole('textbox', { name: 'Промокод' }).fill('e2eosen')
      await sheet.getByRole('button', { name: 'Сохранить' }).click()
      await expect(page.getByText('Акция сохранена')).toBeVisible()
      await expect(page.getByRole('button', { name: /E2E Промокод.*E2EOSEN/ })).toBeVisible()

      // And «happy hours» all day through the API, so any time gets them.
      const hours = await page.request.post(`/api/manage/${SLUG}/promotions`, {
        data: {
          title: 'E2E Весь день',
          kind: 'happy_hours',
          percent: 20,
          weekdays: [0, 1, 2, 3, 4, 5, 6],
          fromMinutes: 0,
          toMinutes: 1440,
        },
      })
      expect(hours.ok()).toBe(true)
      const list = await (await page.request.get(`/api/manage/${SLUG}/promotions`)).json()
      for (const item of list) if (item.title.startsWith('E2E ')) created.push(item.id)

      // Clients see the open promotion, never the code.
      const open = await (await fetch(`${API_URL}/businesses/${SLUG}/promotions`)).json()
      expect(open.some((item: { title: string }) => item.title === 'E2E Весь день')).toBe(true)
      expect(JSON.stringify(open)).not.toContain('E2EOSEN')

      // Find a free time, then quote and book: the biggest discount wins, codes do not stack.
      let date = ''
      let time = ''
      for (let offset = 2; offset < 14 && !date; offset += 1) {
        const candidate = new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10)
        const { slots } = await (
          await fetch(
            `${API_URL}/availability?serviceId=${service.id}&specialistId=${master.id}&date=${candidate}`,
          )
        ).json()
        const free = (slots as Slot[]).find((slot) => slot.isAvailable)
        if (free) {
          date = candidate
          time = free.time
        }
      }
      const quote = await (
        await fetch(`${API_URL}/promotions/quote?serviceId=${service.id}&date=${date}&time=${time}`)
      ).json()
      expect(quote.discount).toMatchObject({ title: 'E2E Весь день', percent: 20 })
      expect(quote.total).toBe(service.price - Math.round(service.price * 0.2))

      const unknown = await fetch(
        `${API_URL}/promotions/quote?serviceId=${service.id}&date=${date}&time=${time}&code=NOPE`,
      )
      expect(unknown.status).toBe(400)

      const booked = await (
        await fetch(`${API_URL}/bookings`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            serviceId: service.id,
            specialistId: master.id,
            date,
            time,
            name: 'E2E Скидка',
            phone: randomClientPhone(),
            smsConfirmation: false,
            promoCode: 'e2eosen',
          }),
        })
      ).json()
      expect(booked.discount).toMatchObject({
        title: 'E2E Промокод',
        amount: Math.round(service.price * 0.3),
      })
      await fetch(`${API_URL}/bookings/${booked.id}`, {
        method: 'DELETE',
        headers: { 'x-booking-token': booked.cancelToken },
      })

      // The booking form shows the discount before the client commits.
      await page.goto(
        `/${SLUG}/book?service=${service.id}&specialist=${master.id}&date=${date}&time=${time}`,
      )
      await expect(page.getByRole('button', { name: 'Показать, что выбрано' })).toContainText(
        '−20%',
      )

      // The catalog marks services with an open promotion.
      await page.goto(`/?q=${encodeURIComponent(service.name)}`)
      await expect(
        page
          .getByRole('article', { name: new RegExp(`${service.name}, Awaisa Studio`) })
          .getByText('−20%'),
      ).toBeVisible()
    } finally {
      for (const id of created) await page.request.delete(`/api/manage/${SLUG}/promotions/${id}`)
    }
  })
})
