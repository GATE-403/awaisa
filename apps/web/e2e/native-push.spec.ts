import { expect, type Page, test } from '@playwright/test'
import { randomClientPhone, signInViaApi } from './account'
import { createOwnBusiness } from './business'
import { withDb } from './visits'

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

test.describe('App pushes through the native bridge', () => {
  test('the API keeps an app token for the signed-in person', async ({ page }) => {
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
    const toggle = page.getByRole('switch', { name: 'Уведомлять о записях' })
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
    await expect(page.getByRole('switch', { name: 'Уведомлять о записях' })).toHaveCount(0)
  })
})
