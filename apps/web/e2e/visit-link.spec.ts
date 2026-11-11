import { createHmac } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { adminPhone, randomClientPhone, signInViaApi } from './account'
import { API_URL } from './helpers'
import './visits'

const SLUG = 'awaisa-studio'
const DEV_AUTH_SECRET = 'dev-only-secret-change-me-in-production-0000'

type Slot = { time: string; isAvailable: boolean }

// The link the confirmation SMS carries.
const visitPath = (id: string) =>
  `/v/${id}?s=${createHmac('sha256', process.env.AUTH_SECRET || DEV_AUTH_SECRET)
    .update(`visit:${id}`)
    .digest('base64url')
    .slice(0, 22)}`

const bookAhead = async () => {
  const business = await (await fetch(`${API_URL}/businesses/${SLUG}`)).json()
  const specialist = business.catalog.specialists[2]
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
    const free = (slots as Slot[]).find((slot) => slot.isAvailable)
    if (!free) continue
    const response = await fetch(`${API_URL}/bookings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        serviceId,
        specialistId: specialist.id,
        date,
        time: free.time,
        name: 'E2E Ссылка',
        phone: randomClientPhone(),
        smsConfirmation: false,
      }),
    })
    return response.json()
  }
  throw new Error('No free day to book')
}

test.describe('Client flow from outside the site', () => {
  test('the SMS link keeps the visit on the phone and lets the client cancel it', async ({
    page,
  }) => {
    const booking = await bookAhead()
    await page.goto(visitPath(booking.id))
    await expect(page).toHaveURL(/\/bookings$/)
    const ticket = page.getByRole('article', { name: /^Запись / }).first()
    await expect(ticket).toContainText(booking.serviceName)

    await ticket.getByRole('button', { name: 'Ещё' }).click()
    await page
      .getByRole('dialog', { name: 'Запись' })
      .getByRole('button', { name: 'Отменить запись' })
      .click()
    await expect(ticket.getByText('Отменена')).toBeVisible()
  })

  test('a link with a wrong signature opens nothing', async ({ page }) => {
    const booking = await bookAhead()
    await page.goto(`/v/${booking.id}?s=${'x'.repeat(22)}`)
    await expect(page.getByRole('heading', { name: /Ссылка не открылась/ })).toBeVisible()
  })

  test('a returning guest finds their name and number already filled in', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'awaisa:contact:v1',
        JSON.stringify({ name: 'E2E Постоянный', phone: '+996 555 000 111' }),
      )
    })
    await page.goto(`/${SLUG}/book`)
    await expect(page.locator('#step-contacts').getByLabel('Имя')).toHaveValue('E2E Постоянный')
    await expect(page.locator('#step-contacts').getByLabel('Телефон')).toHaveValue(
      '+996 555 000 111',
    )
  })

  test('each branch has its own booking link for 2ГИС', async ({ page }, testInfo) => {
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    await page.goto(`/manage/${SLUG}?tab=branches`)
    const links = page.getByRole('heading', { name: 'Ссылки для записи' })
    await expect(links).toBeVisible()
    await expect(page.getByText(new RegExp(`/${SLUG}/book`)).first()).toBeVisible()
  })
})
