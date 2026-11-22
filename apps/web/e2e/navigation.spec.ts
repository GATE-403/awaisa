import { expect, type Page, test } from '@playwright/test'
import { adminPhone, signInViaApi } from './account'
import { mockCreateBooking, succeed } from './fixtures'
import { bookingSteps, primaryAction, submitBooking } from './helpers'

const SLUG = 'lumiere-salon'

// A soft navigation keeps the page's JavaScript; a reload would lose this mark.
const markPage = (page: Page) =>
  page.evaluate(() => {
    ;(window as unknown as { pageMark?: number }).pageMark = 1
  })

const isSamePage = (page: Page) =>
  page.evaluate(() => (window as unknown as { pageMark?: number }).pageMark === 1)

// The newest sheet: while a reload brings the booking back over the catalog, the old one may
// still be on screen for a frame beside it.
const bookingSheet = (page: Page) => page.getByRole('heading', { name: 'Запись', level: 1 }).last()

// A service card a few rows down (the third row of four columns), scrolled to the middle of the screen. Looking for «any card
// wholly on screen» after a fixed scroll found none on CI (other card heights) and clicked nothing.
const bookingCardInMiddle = async (page: Page) => {
  const card = page
    .getByRole('article', { name: /, / })
    .filter({ has: page.locator('a[href*="/book?"]') })
    .nth(10)
  await card.evaluate((node) => node.scrollIntoView({ block: 'center', behavior: 'instant' }))
  // Let the header settle (it tucks its chip row on scroll) before measuring.
  await page.waitForTimeout(500)
  return card
}

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

  test('opening booking far down the catalog keeps its place and kind; a reload keeps it under the sheet', async ({
    page,
  }) => {
    await page.goto('/?kind=barber')
    const header = page.locator('[data-site-header]')
    const chosenKind = header.getByRole('link', { name: 'Барбершопы' })
    await expect(chosenKind).toHaveAttribute('aria-current', 'page')
    const card = await bookingCardInMiddle(page)
    const before = await page.evaluate(() => window.scrollY)
    expect(before).toBeGreaterThan(300)
    const headerHeight = await header.evaluate((node) => node.getBoundingClientRect().height)

    await card.getByRole('link').first().click()
    await expect(bookingSheet(page)).toBeVisible()
    // Next used to scroll the catalog to its top, and the header dropped its category row.
    expect(await page.evaluate(() => window.scrollY)).toBe(before)
    expect(await header.evaluate((node) => node.getBoundingClientRect().height)).toBe(headerHeight)
    await expect(chosenKind).toHaveAttribute('aria-current', 'page')

    const bookingUrl = page.url()
    // A slow catalog after the reload: while it comes back, its skeleton stands under the sheet
    // (the place hidden and nothing in its place left an empty screen under the header).
    await page.route(/\/\?kind=barber&_rsc=/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      await route.continue()
    })
    await page.reload()
    await expect(page.locator('[data-page-skeleton]').first()).toBeVisible()
    await page.unroute(/\/\?kind=barber&_rsc=/)
    await expect(page).toHaveURL(bookingUrl)
    await expect(bookingSheet(page)).toBeVisible()
    // The catalog, not the place's page, is under the sheet again.
    await expect(chosenKind).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('heading', { name: 'Услуги и цены' })).toBeHidden()

    await page.getByRole('link', { name: 'Закрыть запись' }).click()
    await expect(page).toHaveURL((url) => url.pathname === '/' && url.search === '?kind=barber')
    await expect(bookingSheet(page)).toHaveCount(0)
  })

  test('booking from far down the catalog leaves the catalog where it was', async ({ page }) => {
    // The booking itself is answered by a stub: nothing lands in the shared data. So are the free
    // times: one at 12:00 on whatever day is asked for.
    await mockCreateBooking(page, succeed)
    await page.route('**/api/availability**', (route) => {
      const date = new URL(route.request().url()).searchParams.get('date')
      return route.fulfill({ json: { date, slots: [{ time: '12:00', isAvailable: true }] } })
    })
    await page.goto('/')
    const card = await bookingCardInMiddle(page)
    // Where the card is on screen: the first booking also drops the first-visit line from the top
    // of the catalog, and the browser keeps what is on screen in place by moving the scroll.
    const topOnScreen = async () => Math.round((await card.boundingBox())?.y ?? -1)
    const before = await topOnScreen()
    await card.getByRole('link').first().click()
    await expect(bookingSheet(page)).toBeVisible()

    // Through the main action, which does something real on each step: «Любой мастер» on the
    // masters (only when there are several to choose from), then the free time under the ruler.
    // A free time is stubbed: walking the real days clicked day cards under the fixed bar on CI.
    const action = primaryAction(page)
    await expect(action).toHaveText(/^(Любой мастер|Выбрать \d{2}:\d{2}|Выбрать время)$/)
    if ((await action.textContent()) === 'Любой мастер') await action.click()
    await expect(action).toHaveText(/^Выбрать \d{2}:\d{2}$/)
    await action.click()
    const steps = bookingSteps(page)
    await steps.contacts.getByLabel('Имя').fill('E2E Тест')
    await steps.contacts.getByLabel('Телефон').fill('+996 555 000 111')
    await submitBooking(page)
    await expect(page.getByRole('heading', { name: 'Вы записаны' })).toBeVisible()
    // The success screen used to scroll the window, and the catalog under the sheet jumped up.
    await page.waitForTimeout(800)
    expect(Math.abs((await topOnScreen()) - before)).toBeLessThanOrEqual(2)
  })

  test('the sheet rises once: one sheet from the tap to the form, filled in place', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/')
    const card = page.getByRole('article', { name: /, / }).first()
    await expect(card).toBeVisible()
    // A slow answer keeps the placeholder in the sheet mid-slide when the form arrives.
    await page.route(/\/book\?.*_rsc=/, async (route) => {
      if (route.request().headers()['next-router-prefetch']) return route.continue()
      await new Promise((resolve) => setTimeout(resolve, 250))
      await route.continue()
    })
    // Where the sheet is, frame by frame: across on a wide screen, up on a phone.
    await page.evaluate((isPhone) => {
      const track: number[] = []
      const state = window as unknown as {
        sheetTrack: number[]
        sawPlaceholder: boolean
        sheetCount: number
      }
      state.sheetTrack = track
      state.sawPlaceholder = false
      const sheets = new Set<Element>()
      const step = () => {
        const sheet = document.querySelector('[data-booking-screen]')
        if (sheet) {
          sheets.add(sheet)
          state.sheetCount = sheets.size
          if (sheet.querySelector('[aria-busy="true"]')) state.sawPlaceholder = true
          const box = sheet.getBoundingClientRect()
          track.push(isPhone ? box.top : box.left)
        }
        if (track.length < 90) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }, isMobile)
    await card.getByRole('link').first().click()
    await expect(bookingSheet(page)).toBeVisible()
    await page.waitForTimeout(800)
    const { track, sawPlaceholder, sheetCount } = await page.evaluate(() => {
      const state = window as unknown as {
        sheetTrack: number[]
        sawPlaceholder: boolean
        sheetCount: number
      }
      return {
        track: state.sheetTrack,
        sawPlaceholder: state.sawPlaceholder,
        sheetCount: state.sheetCount,
      }
    })
    expect(sawPlaceholder).toBe(true)
    // Two sheets (one in the fallback, one in the form) slid up one after the other.
    expect(sheetCount).toBe(1)
    expect(track.length).toBeGreaterThan(10)
    // It only ever moves one way: dropping back by more than a pixel was the sheet starting over.
    for (let index = 1; index < track.length; index += 1) {
      expect(track[index]).toBeLessThanOrEqual((track[index - 1] ?? 0) + 1)
    }
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
