import { expect, test } from '@playwright/test'

test.describe('Catalog: endless scroll and similar places', () => {
  test('the services feed loads the next page near its end', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('tab', { name: /Услуги/ }).click()
    const cards = page.locator('main article')
    await expect(cards.first()).toBeVisible()
    const first = await cards.count()
    expect(first).toBeLessThanOrEqual(24)
    // Scrolling to the bottom asks the server for the next page in the same order.
    const next = page.waitForResponse((response) =>
      /\/api\/businesses\/offers\?.*offset=24/.test(response.url()),
    )
    await page.mouse.wheel(0, 20_000)
    await next
    await expect.poll(() => cards.count()).toBeGreaterThan(first)
  })

  test('pages continue one order without repeats', async ({ request }) => {
    const page = (offset: number) =>
      request
        .get(`/api/businesses/offers?offset=${offset}&limit=10&sort=price`)
        .then((response) => response.json() as Promise<{ id: string; price: number }[]>)
    const [one, two] = await Promise.all([page(0), page(10)])
    const ids = [...one, ...two].map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)
    const prices = [...one, ...two].map((item) => item.price)
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
  })

  test('a place shows «Похожие места» of its kind', async ({ page }) => {
    await page.goto('/kings-barbershop')
    const similar = page.getByRole('region', { name: 'Похожие места' })
    await similar.scrollIntoViewIfNeeded()
    await expect(similar.getByRole('link').first()).toBeVisible()
    await expect(similar.getByRole('link', { name: /Kings Barbershop/ })).toHaveCount(0)
  })

  test('hearted services show in the profile under «Избранное»', async ({ page, request }) => {
    const offers: { id: string; name: string }[] = await (
      await request.get('/api/businesses/offers?limit=2')
    ).json()
    await page.addInitScript(
      (ids) => window.localStorage.setItem('awaisa:favorites:v1', JSON.stringify(ids)),
      offers.map((offer) => offer.id),
    )
    await page.goto('/bookings')
    // The profile's own tab.
    await page.getByRole('tab', { name: /Избранное/ }).click()
    const shelf = page.getByRole('region', { name: 'Избранное' })
    await expect(shelf.getByRole('article')).toHaveCount(2)
    // The heart takes one off at once.
    await shelf
      .getByRole('button', { name: new RegExp(offers[0]?.name ?? '') })
      .first()
      .click()
    await expect(shelf.getByRole('article')).toHaveCount(1)
  })
})
