import { expect, test } from '@playwright/test'
import { randomClientPhone, signInViaApi } from './account'
import { createOwnBusiness } from './business'
import { API_URL } from './helpers'
import { createPastVisit, withDb } from './visits'

const SLUG = 'awaisa-studio'

type ReviewItem = { comment: string; authorName: string; authorId: string | null }

test.describe('Account data: export and deletion', () => {
  let savedRating: { id: string; rating: number | null } | null = null

  test.afterAll(async () => {
    if (!savedRating) return
    const { id, rating } = savedRating
    // A test review must not change the master's public rating.
    await withDb((client) =>
      client.query('UPDATE "specialists" SET "rating" = $2 WHERE "id" = $1', [id, rating]),
    )
  })

  test('the export holds one’s own visit; deleting ends the session and the review says «Клиент»', async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000)
    const phone = randomClientPhone()
    const { booking, specialist } = await createPastVisit('E2E Удаление Аккаунта', phone)
    savedRating ??= await withDb(async (client) => {
      const { rows } = await client.query('SELECT "rating" FROM "specialists" WHERE "id" = $1', [
        specialist.id,
      ])
      return { id: specialist.id as string, rating: rows[0]?.rating ?? null }
    })
    const comment = `E2E отзыв удаляемого ${testInfo.project.name} ${Date.now()}`
    const review = await page.request.post(`/api/bookings/${booking.id}/review`, {
      headers: { 'x-booking-token': booking.cancelToken },
      data: { rating: 5, comment },
    })
    expect(review.ok()).toBe(true)

    await signInViaApi(page, phone, 'E2E Удаление Аккаунта')

    const exported = await page.request.get('/api/me/export')
    expect(exported.ok()).toBe(true)
    const data = await exported.json()
    expect(data.profile.phone).toBe(phone)
    expect(data.bookings.map((item: { id: string }) => item.id)).toContain(booking.id)
    expect(data.reviews.map((item: { comment: string }) => item.comment)).toContain(comment)
    // Nothing that opens the account or a visit: no tokens, no hashes.
    expect(JSON.stringify(data)).not.toMatch(/token|hash|p256dh|endpoint/i)

    await page.goto('/bookings?tab=settings')
    const download = page.getByRole('button', { name: /Скачать мои данные/ })
    await expect(download).toBeVisible()
    if (testInfo.project.name === 'desktop') {
      const [file] = await Promise.all([page.waitForEvent('download'), download.click()])
      expect(file.suggestedFilename()).toMatch(/^awaisa-\d{4}-\d{2}-\d{2}\.json$/)
    }

    // Held, not confirmed in a dialog.
    await page.getByRole('button', { name: /Удалить аккаунт/ }).click({ delay: 1300 })
    await expect(page.getByText('Аккаунт удалён')).toBeVisible()
    await expect(page).toHaveURL(/\/$/)

    expect((await page.request.get('/api/me')).status()).toBe(401)
    expect((await page.request.get('/api/me/export')).status()).toBe(401)

    const summary = (await (
      await page.request.get(`${API_URL}/businesses/${SLUG}/reviews?limit=50`)
    ).json()) as { items: ReviewItem[] }
    const own = summary.items.find((item) => item.comment === comment)
    expect(own).toMatchObject({ authorName: 'Клиент', authorId: null })

    // The visit stays in the place's books, no longer tied to an account.
    const kept = await withDb((client) =>
      client.query('SELECT "customer_id" FROM "bookings" WHERE "id" = $1', [booking.id]),
    )
    expect(kept.rows[0]).toEqual({ customer_id: null })
  })

  test('the only owner of a business cannot delete the account', async ({ page }) => {
    const business = await createOwnBusiness(page)
    const response = await page.request.delete('/api/me')
    expect(response.status()).toBe(409)
    expect((await response.json()).message).toContain(`единственный владелец «${business.name}»`)
    expect((await page.request.get('/api/me')).ok()).toBe(true)
  })
})
