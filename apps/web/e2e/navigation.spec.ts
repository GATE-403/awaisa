import { expect, type Page, test } from '@playwright/test'
import { adminPhone, signInViaApi } from './account'

const SLUG = 'lumiere-salon'

// A soft navigation keeps the page's JavaScript; a reload would lose this mark.
const markPage = (page: Page) =>
  page.evaluate(() => {
    ;(window as unknown as { pageMark?: number }).pageMark = 1
  })

const isSamePage = (page: Page) =>
  page.evaluate(() => (window as unknown as { pageMark?: number }).pageMark === 1)

const bookingSheet = (page: Page) => page.getByRole('heading', { name: 'Запись', level: 1 })

test.describe('Moving around the app', () => {
  test('the tab bar leads to every section and marks the one open', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'The tab bar is the phone’s navigation')
    await page.goto('/')
    const tabs = page.getByRole('navigation', { name: 'Нижнее меню' })
    await expect(tabs.getByRole('link', { name: 'Каталог' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await markPage(page)

    for (const [label, path] of [
      ['Образы', '/feed'],
      ['Карта', '/map'],
      ['Бизнес', '/business'],
      ['Профиль', '/bookings'],
      ['Каталог', '/'],
    ] as const) {
      await tabs.getByRole('link', { name: label }).click()
      await expect(page).toHaveURL((url) => url.pathname === path)
      await expect(tabs.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page')
    }
    // All of it without reloading the app.
    expect(await isSamePage(page)).toBe(true)

    // Booking and sign-in are screens of their own: no tab bar there.
    await page.goto(`/${SLUG}/book`)
    await expect(bookingSheet(page)).toBeVisible()
    await expect(tabs).toHaveCount(0)
    await page.goto('/login')
    await expect(tabs).toHaveCount(0)
  })

  test('the header leads to every section on a wide screen', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Phones use the tab bar')
    await page.goto('/')
    const header = page.getByRole('navigation', { name: 'Основное меню' })
    await markPage(page)
    for (const [label, path] of [
      ['Образы', '/feed'],
      ['Карта', '/map'],
      ['Рейтинг', '/top'],
      ['Для бизнеса', '/business'],
    ] as const) {
      await header.getByRole('link', { name: label }).click()
      await expect(page).toHaveURL((url) => url.pathname === path)
    }
    await page.getByRole('link', { name: 'На главную' }).click()
    await expect(page).toHaveURL((url) => url.pathname === '/')
    expect(await isSamePage(page)).toBe(true)
  })

  test('booking opens over the place page, and ✕ or back returns to it as it was', async ({
    page,
  }) => {
    await page.goto(`/${SLUG}`)
    await expect(page.getByRole('heading', { name: 'Услуги и цены' })).toBeVisible()
    await markPage(page)

    await page.locator('[data-place-book]').first().click()
    await expect(page).toHaveURL(new RegExp(`/${SLUG}/book$`))
    await expect(bookingSheet(page)).toBeVisible()
    // The place stays under the sheet: the same page, not a new one.
    await expect(page.getByRole('heading', { name: 'Услуги и цены' })).toBeAttached()
    expect(await isSamePage(page)).toBe(true)

    await page.getByRole('link', { name: 'Закрыть запись' }).click()
    await expect(page).toHaveURL(new RegExp(`/${SLUG}$`))
    await expect(bookingSheet(page)).toHaveCount(0)
    expect(await isSamePage(page)).toBe(true)

    // The browser's own back closes it too.
    await page.locator('[data-place-book]').first().click()
    await expect(bookingSheet(page)).toBeVisible()
    await page.goBack()
    await expect(page).toHaveURL(new RegExp(`/${SLUG}$`))
    await expect(bookingSheet(page)).toHaveCount(0)
    expect(await isSamePage(page)).toBe(true)
  })

  test('a service card in the catalog opens booking over the catalog and closes back to it', async ({
    page,
  }) => {
    await page.goto('/')
    await markPage(page)
    const card = page.getByRole('article', { name: /, / }).first()
    await card.getByRole('link').first().click()
    await expect(page).toHaveURL(/\/[^/]+\/book\?service=/)
    await expect(bookingSheet(page)).toBeVisible()

    await page.getByRole('link', { name: 'Закрыть запись' }).click()
    await expect(page).toHaveURL((url) => url.pathname === '/')
    await expect(bookingSheet(page)).toHaveCount(0)
    expect(await isSamePage(page)).toBe(true)
  })

  test('a booking link opened directly shows the place under the sheet; ✕ lands on it', async ({
    page,
  }) => {
    await page.goto(`/${SLUG}/book`)
    await expect(bookingSheet(page)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Услуги и цены' })).toBeAttached()
    await page.getByRole('link', { name: 'Закрыть запись' }).click()
    await expect(page).toHaveURL(new RegExp(`/${SLUG}$`))
    await expect(page.getByRole('heading', { name: 'Услуги и цены' })).toBeVisible()
    await expect(bookingSheet(page)).toHaveCount(0)
  })

  test('the cabinet’s «‹» leads back to where the business side was entered from', async ({
    page,
    isMobile,
  }, testInfo) => {
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    await page.goto('/map')
    const entry = isMobile
      ? page.getByRole('navigation', { name: 'Нижнее меню' }).getByRole('link', { name: 'Кабинет' })
      : page
          .getByRole('navigation', { name: 'Основное меню' })
          .getByRole('link', { name: 'Кабинет' })
    await entry.click()
    await expect(page).toHaveURL(/\/manage/)

    const back = page.getByRole('link', { name: /^(Назад: )?Карта$/ })
    await expect(back).toHaveAttribute('href', '/map')
    await back.click()
    await expect(page).toHaveURL((url) => url.pathname === '/map')
  })
})
