import { type APIRequestContext, expect, test } from '@playwright/test'

const SLUG = 'awaisa-studio'

// A place's pages are the same for everyone: drawn on the first visit, then served whole from the
// cache (generateStaticParams in `app/[slug]/layout.tsx`). After the first visit the page is
// drawn again in the background and cached from then on.
const cacheStatus = async (request: APIRequestContext, path: string) => {
  const response = await request.get(path)
  expect(response.status(), path).toBe(200)
  return response.headers()['x-nextjs-cache'] ?? 'none'
}

test.describe('Cached place pages', () => {
  test('a place and its menu come from the cache after the first visit', async ({
    request,
    isMobile,
  }) => {
    test.skip(isMobile, 'Server output, the same on every device')
    for (const path of [`/${SLUG}`, `/${SLUG}/services`, `/${SLUG}/book`]) {
      await expect
        .poll(() => cacheStatus(request, path), { message: path, timeout: 15_000 })
        .toBe('HIT')
    }
  })

  test('a place unknown to the platform ends as a 404', async ({ request, isMobile }) => {
    test.skip(isMobile, 'Server output, the same on every device')
    // The first visit streams «not found» into the place's shell; the page drawn after it is a 404.
    const path = '/no-such-place-e2e'
    await expect.poll(async () => (await request.get(path)).status(), { message: path }).toBe(404)
  })

  test('the booking opened over a place closes on the next page', async ({ page }) => {
    await page.goto(`/${SLUG}`)
    await page.locator('[data-place-book]').click()
    await expect(page).toHaveURL(new RegExp(`/${SLUG}/book`))
    const sheet = page.locator('[data-sheet-drag]')
    await expect(sheet).toBeVisible()

    // The place's tile in the sheet's bar: a soft navigation to a page the slot has no page for.
    await sheet.locator(`a[href="/${SLUG}"]`).last().click()
    await expect(page).toHaveURL(new RegExp(`/${SLUG}$`))
    await expect(sheet).toHaveCount(0)

    await page.goBack()
    await expect(page).toHaveURL(new RegExp(`/${SLUG}/book`))
    await expect(sheet).toBeVisible()
  })
})
