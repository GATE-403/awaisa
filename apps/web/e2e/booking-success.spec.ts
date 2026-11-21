import { expect, test } from '@playwright/test'
import { mockCreateBooking, succeed } from './fixtures'
import { bookingSteps, pickFirstFreeSlot, submitBooking } from './helpers'

const BOOKED_SERVICE = 'styling'

test.describe('After booking', () => {
  test('«Вам может понравиться» offers the next thing to look at, not the visit just booked', async ({
    page,
  }) => {
    // The booking itself is answered by a stub: nothing lands in the shared data.
    await mockCreateBooking(page, succeed)
    await page.goto(`/awaisa-studio/book?service=${BOOKED_SERVICE}`)
    await bookingSteps(page)
      .specialist.getByRole('radio', { name: /Любой мастер/ })
      .click()
    await pickFirstFreeSlot(page)
    const { contacts } = bookingSteps(page)
    await contacts.getByLabel('Имя').fill('E2E Тест')
    await contacts.getByLabel('Телефон').fill('+996 555 000 111')
    await submitBooking(page)

    const screen = page.locator('[data-booking-screen]')
    await expect(screen.getByRole('heading', { name: 'Вы записаны' })).toBeVisible()
    const shelf = screen.getByRole('region', { name: 'Вам может понравиться' })
    await shelf.scrollIntoViewIfNeeded()
    const picks = shelf.getByRole('listitem').getByRole('link')
    await expect(picks.first()).toHaveAttribute('href', /\/book\?service=/)
    for (const href of await picks.evaluateAll((links) =>
      links.map((link) => link.getAttribute('href') ?? ''),
    )) {
      expect(href).not.toMatch(new RegExp(`/awaisa-studio/book\\?service=${BOOKED_SERVICE}$`))
    }
    await expect(screen.getByRole('link', { name: 'Все места и услуги ›' })).toHaveAttribute(
      'href',
      '/',
    )
  })
})
