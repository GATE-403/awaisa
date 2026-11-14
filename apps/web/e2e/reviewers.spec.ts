import { expect, test } from '@playwright/test'
import { API_URL } from './helpers'

type Summary = { items: { authorId: string | null; authorName: string; serviceId: string }[] }

// Any published place with reviews will do: the demo data has plenty.
const findReviewedPlace = async (request: import('@playwright/test').APIRequestContext) => {
  const places = (await (await request.get(`${API_URL}/businesses?limit=60`)).json()) as {
    slug: string
    reviewCount?: number
  }[]
  for (const place of places) {
    const summary = (await (
      await request.get(`${API_URL}/businesses/${place.slug}/reviews?limit=3`)
    ).json()) as Summary
    const review = summary.items.find((item) => item.authorId)
    if (review) return { slug: place.slug, review }
  }
  return null
}

test.describe('Client profiles', () => {
  test('a review leads to its author’s profile with their reviews', async ({ page, request }) => {
    const found = await findReviewedPlace(request)
    test.skip(!found, 'No reviews in this database')
    if (!found) return

    const profile = await request.get(`${API_URL}/reviewers/${found.review.authorId}`)
    expect(profile.ok()).toBe(true)
    const body = (await profile.json()) as { name: string; count: number; items: unknown[] }
    expect(body.name).toBe(found.review.authorName)
    expect(body.items.length).toBe(Math.min(body.count, 50))
    // The id never gives the phone away and a made-up one finds nobody.
    expect(JSON.stringify(body)).not.toMatch(/\+996/)
    expect((await request.get(`${API_URL}/reviewers/0000000000000000beef`)).status()).toBe(404)
    expect((await request.get(`${API_URL}/reviewers/not-an-id`)).status()).toBe(404)

    const own = (await (
      await request.get(
        `${API_URL}/businesses/${found.slug}/reviews?serviceId=${found.review.serviceId}`,
      )
    ).json()) as Summary
    expect(own.items.every((item) => item.serviceId === found.review.serviceId)).toBe(true)

    // The same id opens a public profile with level and badges.
    const page2 = await request.get(`${API_URL}/profiles/${found.review.authorId}`)
    expect(page2.ok()).toBe(true)
    const publicProfile = (await page2.json()) as { level: { level: number } }
    expect(publicProfile.level.level).toBeGreaterThanOrEqual(1)
    expect((await request.get(`${API_URL}/profiles/0000000000000000beef`)).status()).toBe(404)

    // Laurel wreaths: at most three ranked masters on the platform, ranks 1–3.
    const place = (await (await request.get(`${API_URL}/businesses/${found.slug}`)).json()) as {
      catalog: { specialists: { rank?: number | null }[] }
    }
    for (const master of place.catalog.specialists) {
      expect([null, 1, 2, 3]).toContain(master.rank ?? null)
    }

    // The author's name on the business page leads to that profile.
    await page.goto(`/${found.slug}`)
    await page
      .getByRole('link', { name: `${found.review.authorName}: профиль` })
      .first()
      .click()
    await page.waitForURL(new RegExp(`/u/${found.review.authorId}$`))
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText(/Уровень \d+/).first()).toBeVisible()
  })
})
