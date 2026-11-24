import { expect, test } from '@playwright/test'

const SLUG = 'awaisa-studio'

// English lives at the bare address, Russian and Kyrgyz under their prefix (`app/[lang]`, the
// proxy rewrites bare paths to `/en`). Each language is a page of its own, rendered on the server.
test.describe('Languages', () => {
  test('each language has its own address and the server renders it', async ({ request }) => {
    for (const [path, lang, heading] of [
      ['/', 'en-GB', 'Where to book'],
      ['/ru', 'ru-RU', 'Куда записаться'],
      ['/ky', 'ky-KG', 'Кайда жазыласыз'],
    ] as const) {
      const html = await (await request.get(path)).text()
      expect(html, path).toContain(`lang="${lang}"`)
      expect(html, path).toContain(heading)
    }

    const english = await request.get('/en/map', { maxRedirects: 0 })
    expect(english.status()).toBe(308)
    expect(english.headers().location).toMatch(/\/map$/)

    const sitemap = await (await request.get('/sitemap.xml')).text()
    expect(sitemap).toContain('hreflang="ru-RU" href="')
    expect(sitemap).toMatch(new RegExp(`hreflang="ky-KG" href="[^"]*/ky/${SLUG}"`))

    const robots = await (await request.get('/robots.txt')).text()
    expect(robots).toContain('Disallow: /ru/manage/')
  })

  test('links stay in the language and booking opens in it', async ({ page }) => {
    await page.goto(`/ru/${SLUG}`)
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru-RU')

    const sitePaths = await page
      .locator('a[href^="/"]')
      .evaluateAll((links) =>
        links
          .map((link) => link.getAttribute('href') ?? '')
          .filter((href) => !href.startsWith('/api/')),
      )
    expect(sitePaths.length).toBeGreaterThan(10)
    expect(sitePaths.filter((href) => !href.startsWith('/ru'))).toEqual([])

    await page.locator('[data-place-book]').first().click()
    await expect(page).toHaveURL(new RegExp(`/ru/${SLUG}/book`))
    await expect(page.getByRole('heading', { name: 'Что делаем?' })).toBeVisible()
    await expect(page.getByText(/\d\s?сом/).first()).toBeVisible()
  })

  test('the footer switches the page to another language', async ({ page, isMobile }) => {
    test.skip(isMobile, 'The footer folds its controls on phones; the switch is the same')
    await page.goto('/top?kind=barber')
    await page.getByRole('combobox', { name: 'Language' }).click()
    await page.getByRole('option', { name: 'Кыргызча' }).click()

    await expect(page).toHaveURL(/\/ky\/top\?kind=barber$/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'ky-KG')
    await expect(page.getByRole('combobox', { name: 'Тил' })).toBeVisible()

    // The pick is remembered: a bare address now opens in Kyrgyz, whatever the browser reads.
    await page.goto('/map')
    await expect(page).toHaveURL(/\/ky\/map$/)

    // And English, once picked, stays English.
    await page.goto('/top?kind=barber')
    await page.getByRole('combobox', { name: 'Тил' }).click()
    await page.getByRole('option', { name: 'English' }).click()
    await expect(page).toHaveURL(/\/top\?kind=barber$/)
    await page.goto('/map')
    await expect(page).toHaveURL(/\/map$/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-GB')
  })

  test('a first visit opens in the browser’s language', async ({ browser, request }) => {
    const russian = await browser.newContext({ locale: 'ru-RU' })
    const page = await russian.newPage()
    await page.goto('/map?kind=barber')
    await expect(page).toHaveURL(/\/ru\/map\?kind=barber$/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru-RU')
    await russian.close()

    // A language we do not have, or none at all (a crawler), stays on the English address.
    for (const language of ['de-DE,fr;q=0.8', '']) {
      const response = await request.get('/map', {
        headers: { accept: 'text/html', 'accept-language': language },
        maxRedirects: 0,
      })
      expect(response.status(), language).toBe(200)
    }
    // The app router's own requests for a page's data are never sent elsewhere.
    // (Next checks their `_rsc` against its own headers and may send one to a fresh `_rsc`, on
    // the same address: never to another language.)
    const data = await request.get('/map?_rsc=e2e', {
      headers: { accept: 'text/x-component', rsc: '1', 'accept-language': 'ru' },
      maxRedirects: 0,
    })
    expect(data.headers().location ?? '').not.toMatch(/^\/(ru|ky)\b/)
  })
})
