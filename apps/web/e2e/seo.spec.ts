import { expect, test } from '@playwright/test'

const SLUG = 'awaisa-studio'

test.describe('SEO', () => {
  test('sitemap, robots, JSON-LD and share images', async ({ page, request, isMobile }) => {
    test.skip(isMobile, 'Server output, the same on every device')
    const sitemap = await (await request.get('/sitemap.xml')).text()
    expect(sitemap).toContain(`/${SLUG}</loc>`)
    expect(sitemap).toContain(`/${SLUG}/services</loc>`)

    const robots = await (await request.get('/robots.txt')).text()
    expect(robots).toMatch(/Disallow: \/manage/)
    expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/)

    await page.goto(`/${SLUG}`)
    const jsonLd = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').first().textContent()) ?? '{}',
    )
    expect(jsonLd['@context']).toBe('https://schema.org')
    expect(jsonLd.name).toBe('Awaisa Studio')
    expect(jsonLd.hasOfferCatalog).toBeDefined()
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /Awaisa/)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      new RegExp(`/${SLUG}$`),
    )

    const image = await request.get(`/${SLUG}/opengraph-image`)
    expect(image.status()).toBe(200)
    expect(image.headers()['content-type']).toContain('image/png')
    const home = await request.get('/opengraph-image')
    expect(home.status()).toBe(200)
  })
})
