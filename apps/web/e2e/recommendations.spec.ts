import { expect, test } from '@playwright/test'
import { withDb } from './visits'

type Recommendation = { id: string; name: string; reason: string; slug: string }

test.describe('Recommendations', () => {
  test('a guest answers three questions and gets «Для вас» with reasons', async ({ page }) => {
    // Picks live in the profile, not in the catalog.
    await page.goto('/bookings')
    await page.getByRole('button', { name: /Подберём для вас/ }).click()
    const sheet = page.getByRole('dialog', { name: 'Подберём для вас' })
    // The sheet slides up on phones: tap the rows once it has settled.
    await expect(sheet.getByRole('heading', { name: 'Для кого' })).toBeInViewport()
    await sheet.getByText('Женщине', { exact: true }).click()
    await expect(sheet.getByRole('radio', { name: 'Женщине' })).toBeChecked()
    await sheet.getByText('Маникюр', { exact: true }).click()
    await expect(sheet.getByRole('checkbox', { name: 'Маникюр' })).toBeChecked()
    await sheet.getByRole('button', { name: 'Готово' }).click()
    await expect(page.getByText('Подборка обновлена')).toBeVisible()

    // In the profile the picks sit in the empty «Предстоящие» tab as «Куда записаться».
    const shelf = page.getByRole('region', { name: 'Куда записаться' })
    await expect(shelf).toBeVisible()
    const cards = shelf.getByRole('link')
    await expect(cards.first()).toHaveAccessibleName(/Ваш выбор · ногти/)
    // Services for the other gender are left out.
    await expect(shelf.getByRole('link', { name: /Мужская/ })).toHaveCount(0)
    await expect(cards.first()).toHaveAttribute('href', /\/book\?service=/)
  })

  test('the catalog opens with picks, even for a new guest, and learns what was shown and tapped', async ({
    page,
  }) => {
    await page.goto('/')
    const shelf = page.getByRole('region', { name: 'Для вас' })
    await shelf.scrollIntoViewIfNeeded()
    // The head carries «Рейтинг ›»; the picks are the list's links.
    const first = shelf.getByRole('listitem').getByRole('link').first()
    await expect(first).toHaveAttribute('href', /\/book\?service=/)

    // The shelf in view counts its cards as shown, per device session.
    const session = await page.evaluate(() => localStorage.getItem('awaisa:device:v1'))
    expect(session).toMatch(/^[0-9a-f-]{36}$/)
    const countEvents = (kind: string) =>
      withDb(async (client) => {
        const { rows } = await client.query(
          'SELECT COUNT(*)::int AS "count" FROM "recommendation_events" WHERE "session" = $1 AND "kind" = $2',
          [session, kind],
        )
        return Number(rows[0]?.count ?? 0)
      })
    await expect.poll(() => countEvents('impression'), { timeout: 10_000 }).toBeGreaterThan(0)

    // A tap is sent as the page changes; the shelf will not push an ignored card forever.
    await first.click()
    await page.waitForURL(/\/book\?service=/)
    await expect.poll(() => countEvents('click'), { timeout: 10_000 }).toBe(1)
    await withDb((client) =>
      client.query('DELETE FROM "recommendation_events" WHERE "session" = $1', [session]),
    )
  })

  test('the service being chosen leads the picks; refusing bad event batches', async ({
    request,
  }) => {
    const nails = await (await request.get('/api/businesses/pink-nails')).json()
    const manicure = nails.catalog?.services.find((service: { name: string }) =>
      /маникюр/i.test(service.name),
    )
    test.skip(!manicure, 'No demo nail studio in this database')
    const items: Recommendation[] = await (
      await request.get(`/api/recommendations?like=${manicure.id}&limit=6`)
    ).json()
    expect(items.some((item) => item.id === manicure.id)).toBe(false)
    expect(items.some((item) => /бород|мужск/i.test(item.name))).toBe(false)
    expect(items[0]?.reason).toMatch(/ногти|маникюр/)

    const bad = await request.post('/api/recommendations/events', {
      data: { session: 'x', events: [] },
    })
    expect(bad.status()).toBe(400)
  })

  test('a visit as long ago as people come back puts that service first: «Пора снова»', async ({
    request,
  }) => {
    const business = await (await request.get('/api/businesses/awaisa-studio')).json()
    const service = business.catalog.services[0]
    const fiveWeeksAgo = new Date(Date.now() - 35 * 86_400_000).toISOString().slice(0, 10)
    const items: Recommendation[] = await (
      await request.get(`/api/recommendations?visits=${service.id}~${fiveWeeksAgo}`)
    ).json()
    expect(items[0]).toMatchObject({ id: service.id, slug: 'awaisa-studio' })
    expect(items[0]?.reason).toMatch(/^Пора снова/)
    // At most two cards per place.
    const perPlace = new Map<string, number>()
    for (const item of items) perPlace.set(item.slug, (perPlace.get(item.slug) ?? 0) + 1)
    expect(Math.max(...perPlace.values())).toBeLessThanOrEqual(2)
  })

  test('unknown interests are refused', async ({ request }) => {
    expect((await request.get('/api/recommendations?interests=skydiving')).status()).toBe(400)
  })
})
