import { expect, test } from '@playwright/test'

const SLUG = 'awaisa-studio'

test.describe('SEO', () => {
  test('sitemap, robots, JSON-LD and share images', async ({ page, request, isMobile }) => {
    test.skip(isMobile, 'Server output, the same on every device')
    const sitemap = await (await request.get('/sitemap.xml')).text()
    expect(sitemap).toContain(`/${SLUG}</loc>`)
    expect(sitemap).toContain(`/${SLUG}/services</loc>`)
    expect(sitemap).toContain('/?kind=barber</loc>')
    expect(sitemap).toContain('/top</loc>')
    expect(sitemap).not.toContain('/?kind=other</loc>')

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
  test('catalog kinds are landings, searches are not indexed', async ({
    page,
    request,
    isMobile,
  }) => {
    test.skip(isMobile, 'Server output, the same on every device')
    await page.goto('/?kind=barber&sort=price')
    await expect(page).toHaveTitle('Барбершопы Бишкека: цены и онлайн-запись')
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/\?kind=barber$/)
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0)
    const lists = await page.locator('script[type="application/ld+json"]').allTextContents()
    const graphs = lists.map((text) => JSON.parse(text))
    const places = graphs.find((data) => data['@type'] === 'ItemList')
    expect(places?.itemListElement.length).toBeGreaterThan(0)
    expect(places?.itemListElement[0].url).toMatch(/^https?:\/\/[^/]+\/[a-z0-9-]+$/)
    const site = graphs.find((data) => Array.isArray(data['@graph']))
    expect(site?.['@graph'].map((node: { '@type': string }) => node['@type'])).toEqual([
      'WebSite',
      'Organization',
    ])
    const logo = await request.get(new URL(site?.['@graph'][1].logo).pathname)
    expect(logo.headers()['content-type']).toContain('image/png')

    await page.goto('/?q=%D1%81%D1%82%D1%80%D0%B8%D0%B6%D0%BA%D0%B0')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)

    await page.goto('/top?kind=nails&view=places')
    await expect(page).toHaveTitle(/Лучшие ногтевые студии Бишкека/)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /\/top\?view=places&kind=nails$/,
    )
    await page.goto('/feed?kind=barber')
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/feed$/)
  })
})
