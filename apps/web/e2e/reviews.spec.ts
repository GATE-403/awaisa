import { createHmac } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { adminPhone, randomClientPhone, signInViaApi } from './account'
import { createPastVisit, withDb } from './visits'

const DEV_AUTH_SECRET = 'dev-only-secret-change-me-in-production-0000'

const _WEBHOOK_SECRET = 'e2e-webhook-secret'

const SLUG = 'awaisa-studio'

// The same link the «как прошёл визит?» SMS carries.
const reviewLink = (bookingId: string) => {
  const signature = createHmac('sha256', process.env.AUTH_SECRET || DEV_AUTH_SECRET)
    .update(`review:${bookingId}`)
    .digest('base64url')
    .slice(0, 22)
  return `/review/${bookingId}?s=${signature}`
}

// A 1×1 PNG: enough for the upload pipeline to re-encode.
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

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
    // The reply is typed right under the review and sent with the round button.
    await item.getByLabel('Ответ на отзыв').fill('Спасибо, ждём снова!')
    await item.getByRole('button', { name: 'Отправить ответ' }).click()
    await expect(page.getByText('Ответ опубликован')).toBeVisible()
    await expect(item).toContainText('Спасибо, ждём снова!')
  })

  test('a review link with a wrong signature opens nothing', async ({ page, isMobile }) => {
    test.skip(isMobile, 'API only')
    const response = await page.request.get(
      '/api/bookings/00000000-0000-4000-8000-000000000009/review',
      { headers: { 'x-review-signature': 'x'.repeat(22) } },
    )
    expect(response.status()).toBe(404)
  })
})

test.describe('Rating in one tap', () => {
  test('«Как прошло?» opens the review with the stars tapped; photos go with it', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    const phone = randomClientPhone()
    await signInViaApi(page, phone, 'E2E Оценка Тестов')
    const { booking } = await createPastVisit('E2E Оценка Тестов', phone, 0, 2)

    // One's own profile says a visit waits for its stars.
    const settings = await (await page.request.get('/api/me/profile')).json()
    const own = await (await page.request.get(`/api/profiles/${settings.id}`)).json()
    expect(own.awaitingReview).toBeGreaterThanOrEqual(1)

    await page.goto('/bookings')
    const card = page.getByRole('region', { name: 'Как прошло?' })
    await expect(card).toBeVisible()
    await card.getByRole('button', { name: '4 из 5' }).click()
    const sheet = page.getByRole('dialog')
    await expect(sheet.getByText('Хорошо')).toBeVisible()
    await sheet.getByLabel('Фото к отзыву').setInputFiles({
      name: 'work.png',
      mimeType: 'image/png',
      buffer: PIXEL,
    })
    await expect(sheet.getByRole('img', { name: 'Фото 1' })).toBeVisible()
    const comment = `E2E фото ${Date.now()}`
    await sheet.getByLabel(/Расскажите подробнее/).fill(comment)
    await sheet.getByRole('button', { name: 'Отправить отзыв' }).click()
    await expect(page.getByText('Спасибо за отзыв')).toBeVisible()
    await expect(card).toHaveCount(0)

    const review = await (await page.request.get(`/api/bookings/${booking.id}/review`)).json()
    expect(review.visit.review.rating).toBe(4)
    const reviews = await (
      await page.request.get(`/api/businesses/${SLUG}/reviews?limit=50`)
    ).json()
    const mine = reviews.items.find(
      (item: { comment: string; photos: string[] }) => item.comment === comment,
    )
    expect(mine?.photos).toHaveLength(1)
    // In «Образы» it is marked as the client's own.
    const feed = await (await page.request.get(`/api/feed?business=${SLUG}`)).json()
    const shared = feed.items.find((item: { url: string }) => item.url === mine.photos[0])
    expect(shared?.isFromClient).toBe(true)
  })
})
