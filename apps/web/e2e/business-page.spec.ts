import { expect, type Page, test } from '@playwright/test'

// A seeded salon with a menu worth searching (7 services in 3 sections), six work photos, two
// branches and hundreds of reviews.
const SLUG = 'lumiere-salon'

const services = (page: Page) => page.locator('#services')

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
    await expect(menu.getByRole('heading', { name: 'Услуги и цены' })).toBeVisible()
    await expect(menu.getByText('Часто выбирают')).toBeVisible()

    // A section tab keeps its own services only, and «Часто выбирают» steps aside.
    const sections = menu.getByRole('tablist', { name: 'Разделы услуг' })
    await sections.getByRole('tab', { name: /^Уход/ }).click()
    await expect(sections.getByRole('tab', { name: /^Уход/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(menu.getByText('Часто выбирают')).toHaveCount(0)
    await expect(menu.getByRole('article')).toHaveCount(1)
    await expect(menu.getByRole('article', { name: /^Кератиновое восстановление/ })).toBeVisible()

    await sections.getByRole('tab', { name: /^Все/ }).click()
    const search = menu.getByRole('searchbox', { name: 'Найти услугу' })
    await search.fill('тонир')
    await expect(menu.getByText('Нашли 1 услугу')).toBeVisible()
    await expect(menu.getByRole('article')).toHaveCount(1)
    const card = menu.getByRole('article', { name: /^Тонирование/ })
    // The card books that very service.
    await expect(card.getByRole('link').first()).toHaveAttribute(
      'href',
      new RegExp(`^/${SLUG}/book\\?service=`),
    )

    await search.fill('шиномонтаж')
    await expect(menu.getByText(/Ничего не нашли/)).toBeVisible()
    await menu.getByRole('button', { name: 'Очистить поиск' }).click()
    await expect(search).toHaveValue('')
    await expect(menu.getByText('Часто выбирают')).toBeVisible()
  })

  test('work photos open full screen and turn', async ({ page, isMobile }) => {
    await page.goto(`/${SLUG}`)
    const work = page.locator('#work')
    await work.scrollIntoViewIfNeeded()
    await expect(work.getByRole('link', { name: 'Смотреть с ценами ›' })).toHaveAttribute(
      'href',
      `/feed?business=${SLUG}`,
    )
    await work.getByRole('button', { name: 'Открыть фото 2 из 6' }).click()
    const viewer = page.getByRole('dialog', { name: /: фото 2 из 6$/ })
    await expect(viewer).toBeVisible()

    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('dialog', { name: /: фото 3 из 6$/ })).toBeVisible()
    await page.keyboard.press('ArrowLeft')
    await expect(page.getByRole('dialog', { name: /: фото 2 из 6$/ })).toBeVisible()
    await page.keyboard.press('ArrowLeft')
    await expect(page.getByRole('dialog', { name: /: фото 1 из 6$/ })).toBeVisible()
    if (!isMobile) {
      // The viewer's own arrow: the cards of «Похожие места» leaf their pictures too.
      await page.getByRole('dialog').getByRole('button', { name: 'Следующее фото' }).click()
      await expect(page.getByRole('dialog', { name: /: фото 2 из 6$/ })).toBeVisible()
    }

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: /: фото \d из 6$/ })).toHaveCount(0)

    await work.getByRole('button', { name: 'Открыть фото 1 из 6' }).click()
    await page.getByRole('button', { name: 'Закрыть' }).click()
    await expect(page.getByRole('dialog', { name: /: фото \d из 6$/ })).toHaveCount(0)
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

    await expect(page.getByRole('link', { name: 'Позвонить' }).first()).toHaveAttribute(
      'href',
      `tel:${business.phone}`,
    )
    const route = page.getByRole('link', { name: 'Маршрут' }).first()
    await expect(route).toHaveAttribute('href', /^https:\/\//)
    await expect(route).toHaveAttribute('target', '_blank')

    await page.getByRole('button', { name: 'Поделиться' }).first().click()
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { shared?: ShareData }).shared?.url))
      .toMatch(new RegExp(`/${SLUG}$`))

    // The counts in the head lead to their sections.
    await expect(page.locator('a[href="#services"]').first()).toBeVisible()
    await expect(page.locator('a[href="#masters"]').first()).toBeVisible()
  })

  test('reviews: three to read, the rest a tap away; masters book themselves', async ({ page }) => {
    await page.goto(`/${SLUG}`)
    const reviews = page.locator('#reviews')
    await reviews.scrollIntoViewIfNeeded()
    // The score card: the average with one decimal.
    await expect(reviews.getByRole('img', { name: /^\d\.\d из 5$/ })).toBeVisible()
    await expect.poll(() => countReviews(page)).toBe(3)

    const more = reviews.getByRole('button', { name: /^Ещё \d+ отзыв/ })
    await more.click()
    await expect.poll(() => countReviews(page)).toBeGreaterThan(3)
    await reviews.getByRole('button', { name: 'Скрыть' }).click()
    await expect.poll(() => countReviews(page)).toBe(3)

    const { catalog } = await (await page.request.get(`/api/businesses/${SLUG}`)).json()
    const master = catalog.specialists[0]
    await expect(
      page.locator('#masters').locator(`a[href="/${SLUG}/book?specialist=${master.id}"]`),
    ).toHaveCount(1)
  })
})
