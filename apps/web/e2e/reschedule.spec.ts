import { expect, test } from '@playwright/test'
import { randomClientPhone } from './account'
import { API_URL } from './helpers'
import { createPastVisit } from './visits'

const SLUG = 'awaisa-studio'

type Slot = { time: string; isAvailable: boolean }

// A real future booking for a guest, kept on the device like after booking on the site.
const bookAhead = async () => {
  const business = await (await fetch(`${API_URL}/businesses/${SLUG}`)).json()
  const specialist = business.catalog.specialists[1]
  const serviceId = specialist.serviceIds[0]
  for (let offset = 2; offset <= 14; offset += 1) {
    const date = new Date(Date.now() + offset * 86_400_000 + 6 * 3_600_000)
      .toISOString()
      .slice(0, 10)
    const { slots } = await (
      await fetch(
        `${API_URL}/availability?serviceId=${serviceId}&specialistId=${specialist.id}&date=${date}`,
      )
    ).json()
    const free = (slots as Slot[]).filter((slot) => slot.isAvailable)
    if (free.length < 2) continue
    const response = await fetch(`${API_URL}/bookings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        serviceId,
        specialistId: specialist.id,
        date,
        time: free[0]?.time,
        name: 'E2E Перенос',
        phone: randomClientPhone(),
        smsConfirmation: false,
      }),
    })
    return response.json()
  }
  throw new Error('No free day to book')
}

test.describe('Client reschedules a visit', () => {
  test('from the ticket menu: another day and time with the same master', async ({ page }) => {
    test.setTimeout(60_000)
    const booking = await bookAhead()
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

  test('the API keeps strangers and past visits out', async ({ request }) => {
    const booking = await bookAhead()
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
