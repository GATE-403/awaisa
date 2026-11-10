import { createHmac } from 'node:crypto'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import pg from 'pg'
import { adminPhone, randomClientPhone, signInViaApi } from './account'
import { API_URL } from './helpers'

const ROOT_ENV = join(__dirname, '../../../.env')
const DEV_AUTH_SECRET = 'dev-only-secret-change-me-in-production-0000'
const WEBHOOK_SECRET = 'e2e-webhook-secret'
const SLUG = 'awaisa-studio'

if (existsSync(ROOT_ENV)) process.loadEnvFile(ROOT_ENV)

// The same link the «как прошёл визит?» SMS carries.
const reviewLink = (bookingId: string) => {
  const signature = createHmac('sha256', process.env.AUTH_SECRET || DEV_AUTH_SECRET)
    .update(`review:${bookingId}`)
    .digest('base64url')
    .slice(0, 22)
  return `/review/${bookingId}?s=${signature}`
}

const withDb = async <T>(run: (client: pg.Client) => Promise<T>) => {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    return await run(client)
  } finally {
    await client.end()
  }
}

// A real booking moved into the past, as if the visit already happened.
const createPastVisit = async () => {
  const business = await (await fetch(`${API_URL}/businesses/${SLUG}`)).json()
  const specialist = business.catalog.specialists[0]
  const serviceId = specialist.serviceIds[0]
  for (let offset = 1; offset <= 14; offset += 1) {
    const date = new Date(Date.now() + offset * 86_400_000 + 6 * 3_600_000)
      .toISOString()
      .slice(0, 10)
    const availability = await (
      await fetch(
        `${API_URL}/availability?serviceId=${serviceId}&specialistId=${specialist.id}&date=${date}`,
      )
    ).json()
    const slot = availability.slots.find((item: { isAvailable: boolean }) => item.isAvailable)
    if (!slot) continue
    const response = await fetch(`${API_URL}/bookings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        serviceId,
        specialistId: specialist.id,
        date,
        time: slot.time,
        name: 'E2E Отзыв Тестов',
        phone: randomClientPhone(),
        smsConfirmation: false,
      }),
    })
    const booking = await response.json()
    // Far back, with a random minute: no overlap with any real visit of that master.
    const days = 400 + Math.floor(Math.random() * 300)
    await withDb((client) =>
      client.query(
        `UPDATE "bookings" SET "starts_at" = "starts_at" - make_interval(days => $2, mins => $3),
           "ends_at" = "ends_at" - make_interval(days => $2, mins => $3) WHERE "id" = $1`,
        [booking.id, days, Math.floor(Math.random() * 50)],
      ),
    )
    return { booking, specialist }
  }
  throw new Error('No free slot to create a visit')
}

test.describe('Reviews after a visit', () => {
  let savedRating: { id: string; rating: string | null } | null = null

  test.afterAll(async () => {
    if (!savedRating) return
    const { id, rating } = savedRating
    // Test reviews must not change the master's public rating.
    await withDb((client) =>
      client.query('UPDATE "specialists" SET "rating" = $2 WHERE "id" = $1', [id, rating]),
    )
  })

  test('a client rates the visit from the SMS link; it shows on the page; the owner replies', async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000)
    const { booking, specialist } = await createPastVisit()
    savedRating ??= await withDb(async (client) => {
      const { rows } = await client.query('SELECT "rating" FROM "specialists" WHERE "id" = $1', [
        specialist.id,
      ])
      return { id: specialist.id as string, rating: rows[0]?.rating ?? null }
    })

    // Not rated yet: the device token can see it, but a review before the visit is refused.
    const early = await page.request.get(`/api/bookings/${booking.id}/review`, {
      headers: { 'x-booking-token': booking.cancelToken },
    })
    expect((await early.json()).canReview).toBe(true)

    await page.goto(reviewLink(booking.id))
    await expect(page.getByRole('heading', { name: 'Awaisa Studio' })).toBeVisible()
    // Sending without stars explains what is missing instead of a disabled button.
    await page.getByRole('button', { name: 'Отправить отзыв' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Поставьте оценку' })).toBeVisible()

    await page.getByLabel(/^5 из 5/).check({ force: true })
    await expect(page.getByText('Отлично')).toBeVisible()
    const comment = `E2E отзыв ${testInfo.project.name} ${Date.now()}`
    await page.getByLabel(/Расскажите подробнее/).fill(comment)
    await page.getByRole('button', { name: 'Отправить отзыв' }).click()
    await expect(page.getByText('Спасибо! Отзыв помогает')).toBeVisible()

    // One review per visit.
    const again = await page.request.post(`/api/bookings/${booking.id}/review`, {
      headers: { 'x-booking-token': booking.cancelToken },
      data: { rating: 1 },
    })
    expect(again.status()).toBe(409)

    await page.goto(`/${SLUG}`)
    const reviews = page.getByRole('region', { name: 'Отзывы' })
    await expect(reviews).toContainText(comment)

    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    await page.goto(`/manage/${SLUG}?tab=reviews`)
    const item = page.getByRole('listitem').filter({ hasText: comment })
    await item.getByRole('button', { name: 'Ответить' }).click()
    const sheet = page.getByRole('dialog', { name: 'Ответ на отзыв' })
    await sheet.getByLabel('Ответ').fill('Спасибо, ждём снова!')
    await sheet.getByRole('button', { name: 'Готово' }).click()
    await expect(page.getByText('Ответ опубликован')).toBeVisible()
    await expect(item).toContainText('Спасибо, ждём снова!')
  })

  test('a review link with a wrong signature opens nothing', async ({ page }) => {
    const response = await page.request.get(
      '/api/bookings/00000000-0000-4000-8000-000000000009/review',
      { headers: { 'x-review-signature': 'x'.repeat(22) } },
    )
    expect(response.status()).toBe(404)
  })
})

test.describe('Telegram for owners', () => {
  test('the owner links a chat through the bot and can unlink it', async ({ page }, testInfo) => {
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    await page.goto(`/manage/${SLUG}?tab=profile`)

    const connect = page.getByRole('link', { name: /Подключить (Telegram|ещё один чат)/ })
    await expect(connect).toHaveAttribute('href', /^https:\/\/t\.me\/awaisa_e2e_bot\?start=/)
    const code = new URL((await connect.getAttribute('href')) ?? '').searchParams.get('start')

    // What Telegram sends when the owner taps «Start» in the bot.
    const username = `e2e_owner_${testInfo.project.name}`
    const update = {
      update_id: 1,
      message: {
        text: `/start ${code}`,
        chat: {
          id: 9_000_000 + testInfo.workerIndex * 10 + (testInfo.project.name === 'mobile' ? 1 : 2),
        },
        from: { username },
      },
    }
    expect(
      (await page.request.post(`${API_URL}/telegram/webhook`, { data: update })).status(),
    ).toBe(403)
    const linked = await page.request.post(`${API_URL}/telegram/webhook`, {
      data: update,
      headers: { 'x-telegram-bot-api-secret-token': WEBHOOK_SECRET },
    })
    expect(linked.ok()).toBe(true)

    await page.reload()
    const row = page.getByText(`@${username}`)
    await expect(row).toBeVisible()
    await page
      .getByText(`@${username}`)
      .locator('xpath=ancestor::div[1]/..')
      .getByRole('button', { name: 'Отключить' })
      .click()
    await expect(page.getByText('Уведомления отключены')).toBeVisible()
    await expect(row).toHaveCount(0)
  })
})
