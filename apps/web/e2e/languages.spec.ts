import { expect, type Page, test } from '@playwright/test'
import { createOwnBusiness } from './business'

// The server renders Russian; the language saved in `awaisa:lang:v1` takes over after hydration.
const LANGUAGES = {
  ky: {
    catalogTab: 'Кызматтар',
    placesTab: 'Жайлар',
    placeTabs: 'Жайдын бөлүмдөрү',
    similarHeading: 'Окшош жайлар',
    yourBookings: 'Сиздин жазылууларыңыз',
    bookingsTab: 'Жазылуулар',
    favoritesTab: 'Тандалгандар',
    getCode: 'Код алуу',
    phoneNumber: 'Телефон номери',
    schedule: 'Жадыбал',
    branches: 'Филиалдар',
  },
  en: {
    catalogTab: 'Services',
    placesTab: 'Places',
    placeTabs: 'Place sections',
    similarHeading: 'Similar places',
    yourBookings: 'Your bookings',
    bookingsTab: 'Bookings',
    favoritesTab: 'Favourites',
    getCode: 'Get a code',
    phoneNumber: 'Phone number',
    schedule: 'Schedule',
    branches: 'Branches',
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
        // The header's «Записи»: «Бизнес» reads the same in Kyrgyz, so it proves nothing.
        await expect(page.getByRole('link', { name: text.bookingsTab }).first()).toBeVisible()
      }
    })

    test('a place', async ({ page }) => {
      await page.goto('/lumiere-salon')
      await expect(page.getByRole('tablist', { name: text.placeTabs })).toBeVisible()
      await expect(page.getByRole('heading', { name: text.similarHeading })).toBeAttached()
    })

    test('the profile', async ({ page }) => {
      await page.goto('/bookings')
      await expect(page.getByRole('heading', { name: text.yourBookings })).toBeVisible()
      await expect(page.getByRole('tab', { name: text.bookingsTab })).toBeVisible()
      await expect(page.getByRole('tab', { name: text.favoritesTab })).toBeVisible()
    })

    test('sign-in', async ({ page }) => {
      await page.goto('/login')
      await expect(page.getByLabel(text.phoneNumber)).toBeVisible()
      await expect(page.getByRole('button', { name: text.getCode })).toBeVisible()
    })
  })

  test.describe(`The cabinet in ${language}`, () => {
    test('«Настройки»', async ({ page }) => {
      const business = await createOwnBusiness(page)
      await speak(page, language)
      await page.goto(`/manage/${business.slug}?tab=settings`)
      await expect(
        page.getByRole('link', { name: new RegExp(`^${text.schedule}`) }).first(),
      ).toBeVisible()
      await expect(
        page.getByRole('link', { name: new RegExp(`^${text.branches}`) }).first(),
      ).toBeVisible()
    })
  })
}
