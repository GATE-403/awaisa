import { expect, type Page, test } from '@playwright/test'

// A seeded salon with a menu worth searching (7 services in 3 sections), six work photos, two
// branches and hundreds of reviews.
const SLUG = 'lumiere-salon'

const services = (page: Page) => page.locator('#services')

// The place's sections are tabs like a profile's: “Work · Services · Specialists · Time”.
const openTab = async (page: Page, name: string) => {
  const tab = page.getByRole('tablist', { name: 'Place sections' }).getByRole('tab', {
    name: new RegExp(`^${name}`),
  })
  await tab.click()
  await expect(tab).toHaveAttribute('aria-selected', 'true')
}

// Each review of the thread is an `li` styled `review` (bars and photos are lists too).
const countReviews = (page: Page) =>
  page.evaluate(
    () =>
      [...document.querySelectorAll('#reviews li')].filter((item) =>
        [...item.classList].some((name) => name.endsWith('_review')),
      ).length,
  )

test.describe('Business page', () => {
  test('the menu is searched and cut by section', async ({ page }) => {
    await page.goto(`/${SLUG}`)
    const menu = services(page)
    // The page opens on “Services”: people come to book a service.
    await expect(
      page.getByRole('tablist', { name: 'Place sections' }).getByRole('tab', { name: /^Services/ }),
    ).toHaveAttribute('aria-selected', 'true')
    await expect(menu.getByText('Popular')).toBeVisible()

    // A section chip keeps its own services only, and “Popular” steps aside.
    const sections = menu.getByRole('group', { name: 'Service sections' })
    await sections.getByRole('button', { name: /^Уход/ }).click()
    await expect(sections.getByRole('button', { name: /^Уход/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(menu.getByText('Popular')).toHaveCount(0)
    await expect(menu.getByRole('article')).toHaveCount(1)
    await expect(menu.getByRole('article', { name: /^Кератиновое восстановление/ })).toBeVisible()

    await sections.getByRole('button', { name: /^All/ }).click()
    const search = menu.getByRole('searchbox', { name: 'Find a service' })
    await search.fill('тонир')
    await expect(menu.getByText('Found 1 service')).toBeVisible()
    await expect(menu.getByRole('article')).toHaveCount(1)
    const card = menu.getByRole('article', { name: /^Тонирование/ })
    // The card books that very service.
    await expect(card.getByRole('link').first()).toHaveAttribute(
      'href',
      new RegExp(`^/${SLUG}/book\\?service=`),
    )

    await search.fill('шиномонтаж')
    await expect(menu.getByText(/Nothing found/)).toBeVisible()
    await menu.getByRole('button', { name: 'Clear search' }).click()
    await expect(search).toHaveValue('')
    await expect(menu.getByText('Popular')).toBeVisible()
  })

  test('work photos open full screen and turn', async ({ page, isMobile }) => {
    await page.goto(`/${SLUG}`)
    await openTab(page, 'Work')
    const work = page.locator('#work')
    // The tab's one action at the tabs' row end; phones keep the row for the tabs.
    const prices = page.locator(`a[href="/feed?business=${SLUG}"]`)
    if (isMobile) await expect(prices).toBeHidden()
    else await expect(prices).toHaveText('See with prices')
    await work.getByRole('button', { name: 'Open photo 2 of 6' }).click()
    const viewer = page.getByRole('dialog', { name: /: photo 2 of 6$/ })
    await expect(viewer).toBeVisible()

    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('dialog', { name: /: photo 3 of 6$/ })).toBeVisible()
    await page.keyboard.press('ArrowLeft')
    await expect(page.getByRole('dialog', { name: /: photo 2 of 6$/ })).toBeVisible()
    await page.keyboard.press('ArrowLeft')
    await expect(page.getByRole('dialog', { name: /: photo 1 of 6$/ })).toBeVisible()
    if (!isMobile) {
      // The viewer's own arrow: the cards of “Similar places” leaf their pictures too.
      await page.getByRole('dialog').getByRole('button', { name: 'Next photo' }).click()
      await expect(page.getByRole('dialog', { name: /: photo 2 of 6$/ })).toBeVisible()
    }

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: /: photo \d of 6$/ })).toHaveCount(0)

    await work.getByRole('button', { name: 'Open photo 1 of 6' }).click()
    await page.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(page.getByRole('dialog', { name: /: photo \d of 6$/ })).toHaveCount(0)
  })

  test('the head reaches the place: call, route, share', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: (data: ShareData) => {
          ;(window as unknown as { shared?: ShareData }).shared = data
          return Promise.resolve()
        },
      })
    })
    const { business } = await (await page.request.get(`/api/businesses/${SLUG}`)).json()
    await page.goto(`/${SLUG}`)

    await expect(page.getByRole('link', { name: 'Call' }).first()).toHaveAttribute(
      'href',
      `tel:${business.phone}`,
    )
    const route = page.getByRole('link', { name: 'Directions' }).first()
    await expect(route).toHaveAttribute('href', /^https:\/\//)
    await expect(route).toHaveAttribute('target', '_blank')

    await page.getByRole('button', { name: 'Share' }).first().click()
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { shared?: ShareData }).shared?.url))
      .toMatch(new RegExp(`/${SLUG}$`))

    // The rating leads to the reviews; an anchor opens its tab.
    await expect(page.locator('a[href="#reviews"]').first()).toBeVisible()
    await page.goto(`/${SLUG}#masters`)
    await expect(
      page
        .getByRole('tablist', { name: 'Place sections' })
        .getByRole('tab', { name: /^Specialists/ }),
    ).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('#masters')).toBeVisible()
  })

  test('reviews: three to read, the rest a tap away; masters book themselves', async ({ page }) => {
    await page.goto(`/${SLUG}`)
    const reviews = page.locator('#reviews')
    await reviews.scrollIntoViewIfNeeded()
    // The score card: the average with one decimal.
    await expect(reviews.getByRole('img', { name: /^\d\.\d out of 5$/ })).toBeVisible()
    await expect.poll(() => countReviews(page)).toBe(3)

    const more = reviews.getByRole('button', { name: /^\d+ more review/ })
    await more.click()
    await expect.poll(() => countReviews(page)).toBeGreaterThan(3)
    await reviews.getByRole('button', { name: 'Hide' }).click()
    await expect.poll(() => countReviews(page)).toBe(3)

    const { catalog } = await (await page.request.get(`/api/businesses/${SLUG}`)).json()
    const master = catalog.specialists[0]
    await openTab(page, 'Specialists')
    await expect(
      page.locator('#masters').locator(`a[href="/${SLUG}/book?specialist=${master.id}"]`),
    ).toBeVisible()
  })
})
