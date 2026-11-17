import { expect, test } from '@playwright/test'
import { adminPhone, randomClientPhone, signInViaApi } from './account'
import {
  bookingSteps,
  cancelViaApi,
  pickFirstFreeSlot,
  readStoredBookings,
  submitBooking,
} from './helpers'
import { withDb } from './visits'

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

  test('each flow has its own funnel, read for one kind of device; signals keep codes only', async ({
    page,
  }, testInfo) => {
    const session = `e2e-${Math.random().toString(36).slice(2, 12)}`
    const device = {
      type: 'phone',
      os: 'android',
      app: 'web',
      textScale: 'huge',
      net: 'slow',
      lang: 'ru',
      reducedMotion: false,
      contrastMore: false,
      dark: false,
    }
    const events = await page.request.post('/api/telemetry/events', {
      data: {
        session,
        device,
        events: [
          { step: 'login_open' },
          { step: 'otp_sent', meta: { channel: 'sms' } },
          { step: 'form_error', meta: { field: 'phone' } },
        ],
      },
    })
    expect(events.status()).toBe(202)
    // A value someone typed never fits a code; an unknown flow is refused.
    const typed = await page.request.post('/api/telemetry/events', {
      data: { session, events: [{ step: 'form_error', meta: { field: '+996 555 000 111' } }] },
    })
    expect(typed.status()).toBe(400)

    await signInViaApi(page, adminPhone(testInfo))
    expect((await page.request.get('/api/telemetry/funnel?flow=nope')).status()).toBe(400)
    const funnel = (await (
      await page.request.get('/api/telemetry/funnel?days=1&flow=login&textScale=huge&net=slow')
    ).json()) as {
      flow: string
      segment: Record<string, string>
      steps: { step: string; sessions: number }[]
    }
    expect(funnel.flow).toBe('login')
    expect(funnel.segment).toEqual({ textScale: 'huge', net: 'slow' })
    expect(funnel.steps.map((row) => row.step)).toEqual([
      'login_open',
      'otp_sent',
      'otp_ok',
      'login_done',
    ])
    expect(funnel.steps[1]?.sessions).toBeGreaterThan(0)
    const signals = (await (await page.request.get('/api/telemetry/signals?days=1')).json()) as {
      items: { step: string; value: string | null; sessions: number }[]
    }
    expect(
      signals.items.find((item) => item.step === 'form_error' && item.value === 'phone')?.sessions,
    ).toBeGreaterThan(0)
    const segments = (await (await page.request.get('/api/telemetry/segments?days=1')).json()) as {
      items: { dimension: string; value: string; sessions: number }[]
    }
    expect(
      segments.items.find((item) => item.dimension === 'textScale' && item.value === 'huge')
        ?.sessions,
    ).toBeGreaterThan(0)
  })

  test('the sign-in page reports its step with a coarse device profile', async ({ page }) => {
    // A known device id, so what the page sent can be read back from the database.
    const session = `e2e-${Math.random().toString(36).slice(2, 12)}`
    await page.addInitScript((id) => window.localStorage.setItem('awaisa:device:v1', id), session)
    await page.goto('/login')
    await expect(page.getByLabel('Номер телефона')).toBeVisible()

    const stored = () =>
      withDb(async (client) => {
        const steps = await client.query(
          'SELECT "step", "flow" FROM "funnel_events" WHERE "session" = $1',
          [session],
        )
        const device = await client.query(
          'SELECT "device", "text_scale" FROM "funnel_sessions" WHERE "session" = $1',
          [session],
        )
        return { steps: steps.rows, device: device.rows[0] ?? null }
      })
    await expect
      .poll(async () => (await stored()).steps, { timeout: 15_000 })
      .toContainEqual({
        step: 'login_open',
        flow: 'login',
      })
    const { device } = await stored()
    expect(['phone', 'tablet', 'desktop']).toContain(device?.device)
    expect(device?.text_scale).toBe('normal')
  })
})
