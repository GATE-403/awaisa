import { expect, type Page, test } from '@playwright/test'
import { randomClientPhone, signInViaApi } from './account'
import { createOwnBusiness } from './business'
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

test.describe('Web Push for the business side', () => {
  test.beforeEach(async ({ page }) => {
    const config: PushConfig = await (await page.request.get('/api/push/config')).json()
    test.skip(!config.isAvailable, 'The API under test runs without VAPID keys')
  })

  test('a signed-in person saves and removes a browser subscription', async ({ page }) => {
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

  test('the owner turns notices on and off in «Настройки → Уведомления»', async ({ page }) => {
    const endpoint = endpointFor('owner')
    await stubPushService(page, endpoint)
    const business = await createOwnBusiness(page)

    await page.goto(`/manage/${business.slug}?tab=notifications`)
    const toggle = page.getByRole('switch', { name: 'Уведомлять о записях' })
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
