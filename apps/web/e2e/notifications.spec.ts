import { createHmac } from 'node:crypto'
import { expect, type Page, test } from '@playwright/test'
import { adminPhone, randomClientPhone, signInViaApi } from './account'
import { createOwnBusiness } from './business'
import { API_URL } from './helpers'
import { withDb } from './visits'

type PushConfig = { isAvailable: boolean; publicKey: string | null }

const KEYS = {
  p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
  auth: 'tBHItJI5svbpez7KI4CCXg',
}

const endpointFor = (label: string) =>
  `https://push.example.test/e2e/${label}-${Math.random().toString(36).slice(2)}`

const countRows = (endpoint: string) =>
  withDb(async (client) => {
    const { rows } = await client.query(
      'SELECT COUNT(*)::int AS "count" FROM "push_subscriptions" WHERE "endpoint" = $1',
      [endpoint],
    )
    return (rows[0] as { count: number }).count
  })

// The test browser has no push service: the browser's side (permission, subscription) is played
// by a stub, everything after it (the switch, the API, the table) is real.
const stubPushService = (page: Page, endpoint: string) =>
  page.addInitScript(
    ({ endpoint, keys }) => {
      let permission: NotificationPermission = 'default'
      let subscription: PushSubscription | null = null
      Object.defineProperty(Notification, 'permission', { get: () => permission })
      Notification.requestPermission = async () => {
        permission = 'granted'
        return permission
      }
      const fake = {
        endpoint,
        toJSON: () => ({ endpoint, keys }),
        unsubscribe: async () => {
          subscription = null
          return true
        },
      } as unknown as PushSubscription
      PushManager.prototype.getSubscription = async () => subscription
      PushManager.prototype.subscribe = async () => {
        subscription = fake
        return fake
      }
    },
    { endpoint, keys: KEYS },
  )

// The nearest day with 12:00 free for that master.
const firstFreeDay = async (page: Page, serviceId: string, specialistId: string) => {
  for (let offset = 1; offset <= 14; offset += 1) {
    const date = new Date(Date.now() + offset * 86_400_000 + 6 * 3_600_000)
      .toISOString()
      .slice(0, 10)
    const query = new URLSearchParams({ serviceId, specialistId, date })
    const availability = await (await page.request.get(`/api/availability?${query}`)).json()
    const isFree = availability.slots.some(
      (slot: { time: string; isAvailable: boolean }) => slot.time === '12:00' && slot.isAvailable,
    )
    if (isFree) return date
  }
  throw new Error('No free 12:00 in two weeks')
}

const tokenFor = (label: string) =>
  `ExponentPushToken[e2e${label}${Math.random().toString(36).slice(2, 12)}]`

const readRow = (token: string) =>
  withDb(async (client) => {
    const { rows } = await client.query(
      'SELECT "kind" FROM "push_subscriptions" WHERE "endpoint" = $1',
      [token],
    )
    return (rows[0] as { kind: string } | undefined) ?? null
  })

type Permission = 'granted' | 'undetermined' | 'unavailable'

// The page runs inside the Expo app: `__NATIVE_APP__` and the bridge are played by a stub that
// answers like `apps/mobile` does (a window event), everything after it is real.
const stubNativeApp = (page: Page, token: string, permission: Permission) =>
  page.addInitScript(
    ({ token, permission }) => {
      // The phone keeps its answer across reloads, like the real app.
      let current =
        (sessionStorage.getItem('e2e:native-permission') as typeof permission) ?? permission
      const sent: unknown[] = []
      Object.assign(window, {
        __NATIVE_APP__: { platform: 'ios', version: '1.0.0' },
        __nativeSent: sent,
        ReactNativeWebView: {
          postMessage: (raw: string) => {
            const message = JSON.parse(raw) as { type: string }
            sent.push(message)
            if (message.type !== 'pushStatus' && message.type !== 'pushEnable') return
            if (message.type === 'pushEnable' && current === 'undetermined') {
              current = 'granted'
              sessionStorage.setItem('e2e:native-permission', current)
            }
            const detail = {
              type: 'pushState',
              permission: current,
              token: current === 'granted' ? token : null,
            }
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('awaisa:native', { detail }))
            }, 50)
          },
        },
      })
    },
    { token, permission },
  )

// The e2e API has no Expo access token (it only logs app pushes); the page is told it has one.
const offerNativePush = (page: Page) =>
  page.route('**/api/push/config', (route) =>
    route.fulfill({ json: { isAvailable: false, publicKey: null, isNativeAvailable: true } }),
  )

const LINE = 'Visit confirmations and reminders go to WhatsApp, or by SMS without it.'

const DEV_AUTH_SECRET = 'dev-only-secret-change-me-in-production-0000'

const WEBHOOK_SECRET = 'e2e-webhook-secret'

const SLUG = 'awaisa-studio'

// The same link the “how was your visit?” SMS carries.
const _reviewLink = (bookingId: string) => {
  const signature = createHmac('sha256', process.env.AUTH_SECRET || DEV_AUTH_SECRET)
    .update(`review:${bookingId}`)
    .digest('base64url')
    .slice(0, 22)
  return `/review/${bookingId}?s=${signature}`
}

test.describe('Web Push for the business side', () => {
  test.beforeEach(async ({ page }) => {
    const config: PushConfig = await (await page.request.get('/api/push/config')).json()
    test.skip(!config.isAvailable, 'The API under test runs without VAPID keys')
  })

  test('a signed-in person saves and removes a browser subscription', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'API only')
    const endpoint = endpointFor('api')
    const guest = await page.request.post('/api/me/push-subscriptions', {
      data: { endpoint, keys: KEYS },
    })
    expect(guest.status()).toBe(401)

    await signInViaApi(page, randomClientPhone(), 'E2E Пуш')
    const plain = await page.request.post('/api/me/push-subscriptions', {
      data: { endpoint: endpoint.replace('https:', 'http:'), keys: KEYS },
    })
    expect(plain.status()).toBe(400)

    const saved = await page.request.post('/api/me/push-subscriptions', {
      data: { endpoint, keys: KEYS },
    })
    expect(saved.status()).toBe(204)
    // The same browser again is the same row.
    await page.request.post('/api/me/push-subscriptions', { data: { endpoint, keys: KEYS } })
    expect(await countRows(endpoint)).toBe(1)

    const removed = await page.request.delete('/api/me/push-subscriptions', {
      data: { endpoint },
    })
    expect(removed.status()).toBe(204)
    expect(await countRows(endpoint)).toBe(0)
  })

  test('the owner turns notices on and off in “Settings → Notifications”', async ({ page }) => {
    const endpoint = endpointFor('owner')
    await stubPushService(page, endpoint)
    const business = await createOwnBusiness(page)

    await page.goto(`/manage/${business.slug}?tab=notifications`)
    const toggle = page.getByRole('switch', { name: 'Notify about bookings' })
    await expect(toggle).not.toBeChecked()

    const saving = page.waitForResponse(
      (response) =>
        response.url().endsWith('/me/push-subscriptions') && response.request().method() === 'POST',
    )
    await toggle.click()
    expect((await saving).status()).toBe(204)
    await expect(toggle).toBeChecked()
    expect(await countRows(endpoint)).toBe(1)

    // A booking made by a client reaches the subscription (the fake address only fails quietly).
    const booking = await page.request.post('/api/bookings', {
      data: {
        serviceId: business.service.id,
        specialistId: business.master.id,
        date: await firstFreeDay(page, business.service.id, business.master.id),
        time: '12:00',
        name: 'E2E Пуш Клиент',
        phone: randomClientPhone(),
        smsConfirmation: false,
      },
    })
    expect(booking.status()).toBe(201)

    const removing = page.waitForResponse(
      (response) =>
        response.url().endsWith('/me/push-subscriptions') &&
        response.request().method() === 'DELETE',
    )
    await toggle.click()
    expect((await removing).status()).toBe(204)
    await expect(toggle).not.toBeChecked()
    expect(await countRows(endpoint)).toBe(0)
  })
})

test.describe('App pushes through the native bridge', () => {
  test('the API keeps an app token for the signed-in person', async ({ page, isMobile }) => {
    test.skip(isMobile, 'API only')
    const token = tokenFor('api')
    const guest = await page.request.post('/api/me/push-tokens', { data: { token } })
    expect(guest.status()).toBe(401)

    await signInViaApi(page, randomClientPhone(), 'E2E Пуш')
    const wrong = await page.request.post('/api/me/push-tokens', {
      data: { token: 'https://push.example.test/not-a-token' },
    })
    expect(wrong.status()).toBe(400)

    expect((await page.request.post('/api/me/push-tokens', { data: { token } })).status()).toBe(204)
    await page.request.post('/api/me/push-tokens', { data: { token } })
    expect(await readRow(token)).toEqual({ kind: 'expo' })

    expect((await page.request.delete('/api/me/push-tokens', { data: { token } })).status()).toBe(
      204,
    )
    expect(await readRow(token)).toBeNull()
  })

  test('the owner turns notices on and off in the app', async ({ page }) => {
    const token = tokenFor('owner')
    await stubNativeApp(page, token, 'undetermined')
    await offerNativePush(page)
    const business = await createOwnBusiness(page)

    await page.goto(`/manage/${business.slug}?tab=notifications`)
    const toggle = page.getByRole('switch', { name: 'Notify about bookings' })
    await expect(toggle).not.toBeChecked()

    const saving = page.waitForResponse(
      (response) =>
        response.url().endsWith('/me/push-tokens') && response.request().method() === 'POST',
    )
    await toggle.click()
    expect((await saving).status()).toBe(204)
    await expect(toggle).toBeChecked()
    expect(await readRow(token)).toEqual({ kind: 'expo' })
    const sent = await page.evaluate(
      () => (window as unknown as { __nativeSent: unknown[] }).__nativeSent,
    )
    expect(sent).toContainEqual({ type: 'pushEnable' })

    // Opened again, the app's token is still there and the switch stays on.
    await page.reload()
    await expect(toggle).toBeChecked()

    const removing = page.waitForResponse(
      (response) =>
        response.url().endsWith('/me/push-tokens') && response.request().method() === 'DELETE',
    )
    await toggle.click()
    expect((await removing).status()).toBe(204)
    await expect(toggle).not.toBeChecked()
    expect(await readRow(token)).toBeNull()
  })

  test('an app that cannot get a token shows no switch', async ({ page }) => {
    await stubNativeApp(page, tokenFor('none'), 'unavailable')
    await offerNativePush(page)
    const business = await createOwnBusiness(page)

    await page.goto(`/manage/${business.slug}?tab=notifications`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('switch', { name: 'Notify about bookings' })).toHaveCount(0)
  })
})

// The e2e API runs the WhatsApp log driver (the default outside production): client messages are
// written to its log instead of going to Meta. Which channel took a message is unit-tested
// (`client-messages.service.spec.ts`); here is what an owner and a client see of it.
test.describe('WhatsApp for client messages', () => {
  test('the cabinet says clients hear about visits in WhatsApp while it is on', async ({
    page,
  }) => {
    const business = await createOwnBusiness(page)

    const config = await page.request.get('/api/notifications/config')
    expect(await config.json()).toEqual({ isWhatsappOn: true })

    await page.goto(`/manage/${business.slug}?tab=notifications`)
    await expect(page.getByRole('heading', { name: 'To clients' })).toBeVisible()
    await expect(page.getByText(LINE)).toBeVisible()
  })

  test('with WhatsApp off the cabinet draws nothing about it (SMS as always)', async ({ page }) => {
    const business = await createOwnBusiness(page)
    await page.route('**/api/notifications/config', (route) =>
      route.fulfill({ json: { isWhatsappOn: false } }),
    )
    const answered = page.waitForResponse('**/api/notifications/config')

    await page.goto(`/manage/${business.slug}?tab=notifications`)
    await answered
    await expect(page.getByText(/New bookings, cancellations and reviews/)).toBeVisible()
    await expect(page.getByText(LINE)).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'To clients' })).toHaveCount(0)
  })
})

test.describe('Telegram for owners', () => {
  test('the owner links a chat through the bot and can unlink it', async ({ page }, testInfo) => {
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    await page.goto(`/manage/${SLUG}?tab=notifications`)

    const connect = page.getByRole('link', { name: /Connect (Telegram|another chat)/ })
    await expect(connect).toHaveAttribute('href', /^https:\/\/t\.me\/awaisa_e2e_bot\?start=/)
    const code = new URL((await connect.getAttribute('href')) ?? '').searchParams.get('start')

    // What Telegram sends when the owner taps “Start” in the bot.
    const username = `e2e_owner_${testInfo.project.name}`
    const update = {
      update_id: 1,
      message: {
        text: `/start ${code}`,
        chat: {
          id: 9_000_000 + testInfo.workerIndex * 10 + (testInfo.project.name === 'mobile' ? 1 : 2),
        },
        from: { username },
      },
    }
    expect(
      (await page.request.post(`${API_URL}/telegram/webhook`, { data: update })).status(),
    ).toBe(403)
    const linked = await page.request.post(`${API_URL}/telegram/webhook`, {
      data: update,
      headers: { 'x-telegram-bot-api-secret-token': WEBHOOK_SECRET },
    })
    expect(linked.ok()).toBe(true)

    await page.reload()
    const row = page.getByText(`@${username}`)
    await expect(row).toBeVisible()
    // The nearest block around this chat that has its own button: other chats linked to the
    // business (a developer's own, say) have theirs.
    await row
      .locator('xpath=ancestor::*[.//button[normalize-space()="Disconnect"]][1]')
      .getByRole('button', { name: 'Disconnect' })
      .click()
    await expect(page.getByText('Notifications turned off')).toBeVisible()
    await expect(row).toHaveCount(0)
  })
})
