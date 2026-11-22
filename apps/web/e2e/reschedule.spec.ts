import { expect, test } from '@playwright/test'
import { randomClientPhone } from './account'
import { bookAhead, createPastVisit } from './visits'

const _SLUG = 'awaisa-studio'

// A real future booking for a guest, kept on the device like after booking on the site.

test.describe('Client reschedules a visit', () => {
  test('from the ticket menu: another day and time with the same master', async ({ page }) => {
    test.setTimeout(60_000)
    const booking = await bookAhead({ specialistIndex: 1, name: 'E2E Перенос', minFree: 2 })
    await page.addInitScript(
      (stored) => {
        window.localStorage.setItem('awaisa:bookings:v2', JSON.stringify([stored]))
      },
      { id: booking.id, token: booking.cancelToken, snapshot: booking },
    )

    await page.goto('/bookings')
    const ticket = page.getByRole('article', { name: /^Запись / }).first()
    await expect(ticket).toBeVisible()
    // «Перенести» sits in plain sight under the ticket.
    await page.getByRole('button', { name: 'Перенести', exact: true }).first().click()

    const sheet = page.getByRole('dialog', { name: 'Перенести запись' })
    await expect(sheet).toContainText('Сейчас')
    const time = sheet.getByRole('group', { name: 'Время' }).getByRole('button').first()
    await time.click()
    const newTime = (await time.textContent())?.trim() ?? ''
    await sheet.getByRole('button', { name: `Перенести на ${newTime}` }).click()

    await expect(page.getByText(/Перенесено:/)).toBeVisible()
    await expect(ticket).toContainText(newTime)
  })

  test('the API keeps strangers and past visits out', async ({ request, isMobile }) => {
    test.skip(isMobile, 'API only')
    const booking = await bookAhead({ specialistIndex: 1, name: 'E2E Перенос', minFree: 2 })
    const wrongToken = await request.patch(`/api/bookings/${booking.id}`, {
      headers: { 'x-booking-token': 'x'.repeat(32) },
      data: { date: booking.date, time: booking.time },
    })
    expect(wrongToken.status()).toBe(404)

    const past = await createPastVisit('E2E Перенос прошлое', randomClientPhone(), 0)
    const late = await request.patch(`/api/bookings/${past.booking.id}`, {
      headers: { 'x-booking-token': past.booking.cancelToken },
      data: { date: booking.date, time: booking.time },
    })
    expect(late.status()).toBe(400)
  })
})
