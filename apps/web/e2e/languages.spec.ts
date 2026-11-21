import { expect, type Page, test } from '@playwright/test'

// The server renders Russian; the language saved in `awaisa:lang:v1` takes over after hydration.
const LANGUAGES = {
  ky: {
    catalogTab: 'Кызматтар',
    placesTab: 'Жайлар',
    forBusiness: 'Бизнес үчүн',
    servicesHeading: 'Кызматтар жана баалар',
    similarHeading: 'Окшош жайлар',
    yourBookings: 'Сиздин жазылууларыңыз',
    upcoming: 'Алдыдагылар',
    history: 'Тарых',
  },
  en: {
    catalogTab: 'Services',
    placesTab: 'Places',
    forBusiness: 'For business',
    servicesHeading: 'Services and prices',
    similarHeading: 'Similar places',
    yourBookings: 'Your bookings',
    upcoming: 'Upcoming',
    history: 'History',
  },
} as const

const speak = (page: Page, language: keyof typeof LANGUAGES) =>
  page.addInitScript((code) => window.localStorage.setItem('awaisa:lang:v1', code), language)

for (const [language, text] of Object.entries(LANGUAGES) as [
  keyof typeof LANGUAGES,
  (typeof LANGUAGES)[keyof typeof LANGUAGES],
][]) {
  test.describe(`Client screens in ${language}`, () => {
    test.beforeEach(async ({ page }) => {
      await speak(page, language)
    })

    test('the catalog', async ({ page }, testInfo) => {
      await page.goto('/')
      await expect(page.getByRole('tab', { name: text.catalogTab }).first()).toBeVisible()
      await expect(page.getByRole('tab', { name: text.placesTab }).first()).toBeVisible()
      if (testInfo.project.name === 'desktop') {
        await expect(page.getByRole('link', { name: text.forBusiness }).first()).toBeVisible()
      }
    })

    test('a place', async ({ page }) => {
      await page.goto('/lumiere-salon')
      await expect(page.getByRole('heading', { name: text.servicesHeading })).toBeVisible()
      await expect(page.getByRole('heading', { name: text.similarHeading })).toBeAttached()
    })

    test('the profile', async ({ page }) => {
      await page.goto('/bookings')
      await expect(page.getByRole('heading', { name: text.yourBookings })).toBeVisible()
      await expect(page.getByText(text.upcoming, { exact: false }).first()).toBeVisible()
      await expect(page.getByText(text.history, { exact: false }).first()).toBeVisible()
    })
  })
}

test('Russian stays the default', async ({ page }) => {
  await page.goto('/lumiere-salon')
  await expect(page.getByRole('heading', { name: 'Услуги и цены' })).toBeVisible()
})
