import { expect, type Page, test } from '@playwright/test'
import { randomClientPhone } from './account'
import { bishkekDay, createOwnBusiness, type OwnBusiness } from './business'
import { API_URL } from './helpers'
import { withDb } from './visits'

// The parts of «Аналитика» that say what to do and why: what needs attention, money lost, who
// comes back, where bookings come from, what promotions and loyalty brought. A business of the
// test's own gets an exact history, so every figure is known in advance.
const PRICE = 1000

type Booked = { id: string; token: string; date: string; time: string }

const firstFreeSlot = async (business: OwnBusiness, day: string) => {
  const availability = await (
    await fetch(
      `${API_URL}/availability?serviceId=${business.service.id}&specialistId=${business.master.id}&date=${day}`,
    )
  ).json()
  const slot = availability.slots?.find((item: { isAvailable: boolean }) => item.isAvailable)
  if (!slot) throw new Error(`No free time on ${day}`)
  return String(slot.time)
}

// A client's own online booking tomorrow (a promo code, SMS consent as asked).
const bookOnline = async (
  business: OwnBusiness,
  name: string,
  phone: string,
  extra: { promoCode?: string; smsConfirmation?: boolean } = {},
): Promise<Booked> => {
  const date = bishkekDay(1)
  const time = await firstFreeSlot(business, date)
  const response = await fetch(`${API_URL}/bookings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      serviceId: business.service.id,
      specialistId: business.master.id,
      date,
      time,
      name,
      phone,
      smsConfirmation: extra.smsConfirmation ?? false,
      promoCode: extra.promoCode,
    }),
  })
  if (!response.ok) throw new Error(`Booking failed: ${response.status} ${await response.text()}`)
  const booking = await response.json()
  return { id: booking.id, token: booking.cancelToken, date, time }
}

// The same time of day, `daysBack` days ago: each visit lands on a day of its own.
const moveBack = async (booking: { id: string; date: string }, daysBack: number) => {
  const target = bishkekDay(-daysBack)
  const shift = Math.round((Date.parse(booking.date) - Date.parse(target)) / 86_400_000)
  await withDb((client) =>
    client.query(
      `UPDATE "bookings" SET "starts_at" = "starts_at" - make_interval(days => $2),
         "ends_at" = "ends_at" - make_interval(days => $2) WHERE "id" = $1`,
      [booking.id, shift],
    ),
  )
  return target
}

const pastVisit = async (
  page: Page,
  business: OwnBusiness,
  name: string,
  phone: string,
  daysBack: number,
  outcome: Record<string, unknown> | null,
  extra: { promoCode?: string; smsConfirmation?: boolean } = {},
) => {
  const booking = await bookOnline(business, name, phone, extra)
  const date = await moveBack(booking, daysBack)
  if (outcome) {
    const marked = await page.request.patch(
      `/api/manage/${business.slug}/bookings/${booking.id}/outcome`,
      { data: outcome },
    )
    expect(marked.ok(), await marked.text()).toBe(true)
  }
  return { ...booking, date }
}

test.describe('Analytics: what to do and why', () => {
  test('attention, losses, sources, retention, promotions and loyalty add up to the history', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    const business = await createOwnBusiness(page, {
      services: [{ name: 'Стрижка', durationMinutes: 60, price: PRICE }],
    })
    const manage = `/api/manage/${business.slug}`
    const arrived = { outcome: 'arrived' }

    // A product under its minimum, a promo code, a certificate.
    await page.request.post(`${manage}/stock`, {
      data: { name: 'E2E Краска', unit: 'шт', unitCost: 50, minQuantity: 5 },
    })
    const promotion = await page.request.post(`${manage}/promotions`, {
      data: { title: 'E2E Код', kind: 'promo_code', percent: 20, code: 'E2EMINUS20' },
    })
    expect(promotion.ok(), await promotion.text()).toBe(true)
    const staffClient = randomClientPhone()
    const certificate = await (
      await page.request.post(`${manage}/loyalty/certificates`, {
        data: { amount: 1000, recipient: 'E2E Подарок', phone: staffClient },
      })
    ).json()

    // Before the period: three first visits 42–84 days ago, one of them came back 50 days ago;
    // the one 80 days ago kept SMS on and has not been back since («давно не были»).
    await pastVisit(page, business, 'E2E Пропал', randomClientPhone(), 80, arrived, {
      smsConfirmation: true,
    })
    const regular = randomClientPhone()
    await pastVisit(page, business, 'E2E Вернулся', regular, 70, arrived)
    await pastVisit(page, business, 'E2E Вернулся', regular, 50, arrived)
    await pastVisit(page, business, 'E2E Разовый', randomClientPhone(), 65, arrived)

    // The period (30 days): an online visit with the code (paid 800), a staff booking paid 300 by
    // the certificate and 700 in money, an imported visit, a visit nobody marked, a no-show and a
    // client's cancellation two hours before the time.
    await pastVisit(page, business, 'E2E Промокод', randomClientPhone(), 5, arrived, {
      promoCode: 'E2EMINUS20',
    })
    await pastVisit(page, business, 'E2E Неявка', randomClientPhone(), 4, { outcome: 'no_show' })

    const staffDate = bishkekDay(1)
    const staffBooking = await page.request.post(`${manage}/bookings`, {
      data: {
        serviceId: business.service.id,
        specialistId: business.master.id,
        date: staffDate,
        time: await firstFreeSlot(business, staffDate),
        name: 'E2E Записал админ',
        phone: staffClient,
      },
    })
    expect(staffBooking.ok(), await staffBooking.text()).toBe(true)
    const staffId = String((await staffBooking.json()).id)
    await moveBack({ id: staffId, date: staffDate }, 3)
    const paidByCertificate = await page.request.patch(`${manage}/bookings/${staffId}/outcome`, {
      data: { outcome: 'arrived', certificateCode: certificate.code, certificateAmount: 300 },
    })
    expect((await paidByCertificate.json()).paidAmount).toBe(700)

    const importDate = bishkekDay(1)
    const imported = await page.request.post(`${manage}/import/bookings`, {
      data: {
        bookings: [
          {
            date: importDate,
            time: await firstFreeSlot(business, importDate),
            service: 'Стрижка',
            master: business.master.name,
            name: 'E2E Импорт',
            phone: randomClientPhone(),
            comment: '',
          },
        ],
        remind: false,
      },
    })
    expect(imported.ok(), await imported.text()).toBe(true)
    const importId = await withDb(async (client) => {
      const { rows } = await client.query(
        `SELECT b."id" FROM "bookings" b JOIN "businesses" bz ON bz."id" = b."business_id"
         WHERE bz."slug" = $1 AND b."customer_name" = 'E2E Импорт'`,
        [business.slug],
      )
      return String(rows[0]?.id)
    })
    await moveBack({ id: importId, date: importDate }, 2)
    await page.request.patch(`${manage}/bookings/${importId}/outcome`, { data: arrived })

    const unmarked = await pastVisit(
      page,
      business,
      'E2E Без отметки',
      randomClientPhone(),
      1,
      null,
    )

    const cancelled = await bookOnline(business, 'E2E Поздняя отмена', randomClientPhone())
    const cancel = await fetch(`${API_URL}/bookings/${cancelled.id}`, {
      method: 'DELETE',
      headers: { 'x-booking-token': cancelled.token },
    })
    expect(cancel.ok).toBe(true)
    // Cancelled now, for a time two hours ago: under a day before the visit.
    await withDb((client) =>
      client.query(
        `UPDATE "bookings" SET "starts_at" = now() - interval '2 hours',
           "ends_at" = now() - interval '1 hour' WHERE "id" = $1`,
        [cancelled.id],
      ),
    )

    const report = await (await page.request.get(`${manage}/analytics?days=30`)).json()

    // Money: 800 + 700 + 1 000 imported + 1 000 not yet marked; a month before, 1 000.
    expect(report.totals).toMatchObject({
      revenue: 3500,
      visits: 4,
      revenueChange: 250,
      visitsChange: 300,
      noShows: 1,
    })
    const sum = (days: { revenue: number }[]) => days.reduce((total, day) => total + day.revenue, 0)
    expect(sum(report.daily)).toBe(3500)
    expect(sum(report.previousDaily)).toBe(1000)

    expect(report.attention).toEqual({
      unmarked: { count: 1, firstDate: unmarked.date },
      lapsed: { count: 1, days: 60 },
      // Tomorrow: 10:00–20:00, one master, nothing booked.
      freeTomorrow: { minutes: 600, date: bishkekDay(1) },
      lowStock: { count: 1, names: ['E2E Краска'] },
    })
    expect(report.losses).toEqual({
      noShows: { count: 1, amount: PRICE },
      lateCancellations: { count: 1, amount: PRICE },
      repeatNoShows: [],
    })
    expect(report.retention).toEqual({ days: 42, clients: 3, returned: 1, rate: 33 })
    expect(report.sources).toMatchObject({ online: 2, staff: 1, import: 1 })
    expect(report.sources.branches).toHaveLength(1)
    expect(report.promotions).toEqual([
      expect.objectContaining({ title: 'E2E Код', visits: 1, revenue: 800, discount: 200 }),
    ])
    expect(report.loyalty).toEqual({ bonusSpent: 0, certificateSpent: 300, subscriptionVisits: 0 })

    // The tab says the same and each attention row leads to what it asks for.
    await page.goto(`/manage/${business.slug}?tab=analytics`)
    const attention = page.getByRole('region', { name: 'Требует внимания' })
    await expect(
      attention.getByRole('link', { name: /1 визит без отметки.*Отметить/ }),
    ).toHaveAttribute('href', `?tab=schedule&date=${unmarked.date}`)
    await expect(attention.getByRole('link', { name: /Завтра свободно ≈ 10 ч/ })).toHaveAttribute(
      'href',
      `?tab=schedule&date=${bishkekDay(1)}`,
    )
    await expect(
      attention.getByRole('link', { name: /Заканчивается: E2E Краска/ }),
    ).toHaveAttribute('href', '?tab=stock')

    const losses = page.getByRole('region', { name: /Потери/ })
    await expect(losses).toContainText(/Потери\s*2\s000\sсом/)
    await expect(losses.getByRole('listitem').filter({ hasText: 'Неявки' })).toContainText(
      /1 визит\s*1\s000\sсом/,
    )
    await expect(losses.getByRole('listitem').filter({ hasText: 'Поздние отмены' })).toContainText(
      /1\s000\sсом/,
    )

    const sources = page.getByRole('region', { name: 'Откуда записи' })
    await expect(sources).toContainText(/Онлайн\s*50%/)
    await expect(sources).toContainText(/Администратор\s*25%/)
    await expect(sources).toContainText(/Импорт\s*25%/)

    const promotions = page.getByRole('region', { name: 'Акции и лояльность' })
    await expect(promotions.getByRole('listitem').filter({ hasText: 'E2E Код' })).toContainText(
      /1 визит · скидки 200\sсом\s*800\sсом/,
    )
    await expect(promotions).toContainText(/Лояльность: сертификатами 300\sсом\./)

    await expect(page.getByText('возвращаются 33% за 6 недель')).toBeVisible()

    // «Позвать» opens the mailing on the clients who stopped coming.
    await attention.getByRole('button', { name: /1 клиент давно не были.*Позвать/ }).click()
    const mailing = page.getByRole('dialog', { name: 'Рассылка' })
    await expect(mailing).toBeVisible()
    await expect(mailing).toContainText('E2E Пропал')
  })
})
