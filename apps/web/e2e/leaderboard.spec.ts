import { expect, test } from '@playwright/test'
import { API_URL } from './helpers'

type Master = {
  place: number
  id: string
  name: string
  reviews: number
  business: { slug: string }
}

test.describe('Masters leaderboard', () => {
  test('barbers by reviews, a podium that books, other kinds by tab', async ({ page, request }) => {
    const masters = (await (
      await request.get(`${API_URL}/rankings/masters?kind=barber&limit=10`)
    ).json()) as Master[]
    test.skip(masters.length < 3, 'Not enough reviewed barbers in this database')
    masters.forEach((master, index) => {
      expect(master.place).toBe(index + 1)
      expect(master.reviews).toBeGreaterThanOrEqual(3)
    })
    expect((await request.get(`${API_URL}/rankings/masters?kind=cars`)).status()).toBe(400)

    await page.goto('/top')
    await expect(page.getByRole('heading', { name: 'Top barbers' })).toBeVisible()
    const first = page.getByRole('link', { name: /^place 1\b/ })
    await expect(first).toHaveAttribute(
      'href',
      `/${masters[0]?.business.slug}/book?specialist=${masters[0]?.id}`,
    )
    // “Specialists · Places” is a segmented control that changes the board.
    await page.getByText('Places', { exact: true }).click()
    await page.waitForURL(/\/top\?view=places/)
    await expect(page.getByRole('heading', { name: 'Top barbershops' })).toBeVisible()
    await page.goto('/top')

    await page.getByRole('link', { name: 'Nails' }).click()
    await page.waitForURL(/\/top\?kind=nails/)
    await expect(page.getByRole('heading', { name: 'Top manicurists' })).toBeVisible()

    // Places: the same board for the places themselves, reviews ≥ 5, each opening its page.
    const places = (await (
      await request.get(`${API_URL}/rankings/places?kind=barber&limit=5`)
    ).json()) as { place: number; slug: string; reviews: number }[]
    for (const place of places) expect(place.reviews).toBeGreaterThanOrEqual(5)
    await page.goto('/top?view=places')
    await expect(page.getByRole('heading', { name: 'Top barbershops' })).toBeVisible()
    if (places[0]) {
      await expect(page.getByRole('link', { name: /^place 1\b/ })).toHaveAttribute(
        'href',
        `/${places[0].slug}`,
      )
    }
  })
})
