import { expect, test } from '@playwright/test'
import { adminPhone, randomClientPhone, signInViaApi } from './account'
import {
  bookingSteps,
  cancelViaApi,
  pickFirstFreeSlot,
  readStoredBookings,
  submitBooking,
} from './helpers'

test.describe('Booking for someone else, Kyrgyz, Telegram and telemetry', () => {
  test('a signed-in client books mum with her own name and number; it stays in the account', async ({
    page,
  }) => {
    test.setTimeout(60_000)
    const phone = randomClientPhone()
    const mumPhone = randomClientPhone()
    await signInViaApi(page, phone, 'E2E Дочь')
    await page.goto('/awaisa-studio/book')
    const steps = bookingSteps(page)
    await steps.service.getByRole('radio', { name: /Мужская стрижка/ }).click()
    await pickFirstFreeSlot(page)

    // Signed in: no phone field until «Записать другого человека».
    await expect(steps.contacts.getByLabel('Телефон')).toHaveCount(0)
    await steps.contacts.getByRole('button', { name: 'Записать другого человека' }).click()
    await steps.contacts.getByLabel('Имя').fill('E2E Мама')
    await steps.contacts.getByLabel('Телефон').fill(mumPhone)
    await submitBooking(page)
    await expect(page.getByRole('heading', { name: 'Вы записаны' })).toBeVisible()

    const [stored] = await readStoredBookings(page)
    if (!stored) throw new Error('booking not saved')
    // The account lists it although the number is mum's.
    const mine = await page.request.get('/api/me/bookings')
    const items = (await mine.json()) as { id: string; customerName: string }[]
    expect(items.find((item) => item.id === stored.id)?.customerName).toBe('E2E Мама')

    // «Напоминать в Telegram» answers for the booking (no link without a bot in tests).
    const telegram = await page.request.get(`/api/bookings/${stored.id}/telegram`)
    expect(telegram.ok()).toBe(true)
    expect(await telegram.json()).toMatchObject({ isLinked: false })
    await cancelViaApi(stored)
  })

  test('the booking form speaks Kyrgyz when chosen', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('awaisa:lang:v1', 'ky'))
    await page.goto('/lumiere-salon/book')
    await expect(page.getByRole('heading', { name: 'Эмне кылабыз?' })).toBeVisible()
    await expect(page.getByRole('radiogroup', { name: 'Кызмат' })).toBeVisible()
  })

  test('funnel steps and errors are kept; only platform admins read them', async ({
    page,
  }, testInfo) => {
    const session = `e2e-${Math.random().toString(36).slice(2, 12)}`
    const events = await page.request.post('/api/telemetry/events', {
      data: {
        session,
        events: [{ step: 'catalog' }, { step: 'booking_open', slug: 'lumiere-salon' }],
      },
    })
    expect(events.status()).toBe(202)
    const message = `E2E error ${session}`
    const error = await page.request.post('/api/telemetry/errors', {
      data: { session, message, url: '/e2e' },
    })
    expect(error.status()).toBe(202)
    const bad = await page.request.post('/api/telemetry/events', {
      data: { session, events: [{ step: 'nope' }] },
    })
    expect(bad.status()).toBe(400)

    await signInViaApi(page, randomClientPhone())
    expect((await page.request.get('/api/telemetry/funnel')).status()).toBe(403)

    await page.context().clearCookies()
    await signInViaApi(page, adminPhone(testInfo))
    const funnel = (await (await page.request.get('/api/telemetry/funnel?days=1')).json()) as {
      steps: { step: string; sessions: number }[]
    }
    expect(funnel.steps.map((row) => row.step)[0]).toBe('catalog')
    expect(funnel.steps.find((row) => row.step === 'booking_open')?.sessions).toBeGreaterThan(0)
    const errors = (await (await page.request.get('/api/telemetry/errors?days=1')).json()) as {
      items: { message: string; source: string }[]
    }
    expect(errors.items.find((item) => item.message === message)?.source).toBe('web')
  })
})
