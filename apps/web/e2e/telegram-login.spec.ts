import { randomBytes } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { randomClientPhone } from './account'
import { API_URL } from './helpers'
import { withDb } from './visits'

const WEBHOOK_SECRET = 'e2e-webhook-secret'

// «Войти через Telegram»: the page's token, the bot's /start, the person's own number shared
// in the chat, then the page's check opens a session on that number.
test.describe('Sign-in through the Telegram bot', () => {
  test('a shared number signs the page in once; a forwarded one does not', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'API only')
    const config = await (await page.request.get('/api/auth/telegram')).json()
    expect(config).toEqual({
      isAvailable: true,
      botUsername: 'awaisa_e2e_bot',
      isCodeAvailable: true,
    })

    const token = randomBytes(32).toString('base64url')
    const phone = randomClientPhone()
    const chatId = 7_000_000_000 + Math.floor(Math.random() * 1_000_000)
    const bot = (message: Record<string, unknown>) =>
      page.request.post(`${API_URL}/telegram/webhook`, {
        data: { update_id: Date.now(), message: { chat: { id: chatId }, ...message } },
        headers: { 'x-telegram-bot-api-secret-token': WEBHOOK_SECRET },
      })
    const check = async () =>
      (await page.request.post('/api/auth/telegram/check', { data: { token } })).json()

    expect((await page.request.post('/api/auth/telegram', { data: { token } })).status()).toBe(204)
    expect(await check()).toEqual({ status: 'pending' })

    expect((await bot({ text: `/start login_${token}`, from: { id: chatId } })).ok()).toBe(true)
    // Someone else's contact, forwarded: not a sign-in.
    await bot({ from: { id: chatId }, contact: { phone_number: phone, user_id: chatId + 1 } })
    expect(await check()).toEqual({ status: 'pending' })

    await bot({ from: { id: chatId }, contact: { phone_number: phone, user_id: chatId } })
    const signedIn = await check()
    expect(signedIn.status).toBe('signedIn')
    expect(signedIn.customer.phone).toBe(phone)
    const me = await (await page.request.get('/api/me')).json()
    expect(me.phone).toBe(phone)
    // Reminders for that number now go to the chat.
    const linked = await withDb((client) =>
      client.query('SELECT "chat_id" FROM "client_telegram_chats" WHERE "phone" = $1', [phone]),
    )
    expect(linked.rows[0]?.chat_id).toBe(String(chatId))

    // A token signs in once.
    expect(await check()).toEqual({ status: 'expired' })

    // The same chat signs in again without sharing the number twice; /stop forgets it.
    const again = randomBytes(32).toString('base64url')
    const checkAgain = async (value: string) =>
      (await page.request.post('/api/auth/telegram/check', { data: { token: value } })).json()
    await page.request.post('/api/auth/telegram', { data: { token: again } })
    await bot({ text: `/start login_${again}`, from: { id: chatId } })
    const remembered = await checkAgain(again)
    expect(remembered.status).toBe('signedIn')
    expect(remembered.customer.phone).toBe(phone)

    await bot({ text: '/stop', from: { id: chatId } })
    const afterStop = randomBytes(32).toString('base64url')
    await page.request.post('/api/auth/telegram', { data: { token: afterStop } })
    await bot({ text: `/start login_${afterStop}`, from: { id: chatId } })
    expect(await checkAgain(afterStop)).toEqual({ status: 'pending' })

    await withDb(async (client) => {
      await client.query('DELETE FROM "client_telegram_chats" WHERE "phone" = $1', [phone])
      await client.query('UPDATE "customers" SET "name" = $2 WHERE "phone" = $1', [
        phone,
        'E2E Telegram',
      ])
    })
  })

  test('the sign-in page waits for the bot and signs in by itself', async ({ page, context }) => {
    // The bot link opens Telegram in a new tab; the test stays on our page.
    await context.route('https://t.me/**', (route) => route.fulfill({ body: 'Telegram' }))
    await page.goto('/login?next=/bookings')
    const button = page.getByRole('link', { name: 'Войти через Telegram' })
    await expect(button).toHaveAttribute('href', /^https:\/\/t\.me\/awaisa_e2e_bot\?start=login_/)
    const href = (await button.getAttribute('href')) ?? ''
    const token = href.split('login_')[1] ?? ''
    await button.click()
    await expect(page.getByRole('heading', { name: 'Подтвердите в Telegram' })).toBeVisible()

    const phone = randomClientPhone()
    const chatId = 7_100_000_000 + Math.floor(Math.random() * 1_000_000)
    const bot = (message: Record<string, unknown>) =>
      page.request.post(`${API_URL}/telegram/webhook`, {
        data: {
          update_id: Date.now(),
          message: { chat: { id: chatId }, from: { id: chatId }, ...message },
        },
        headers: { 'x-telegram-bot-api-secret-token': WEBHOOK_SECRET },
      })
    await bot({ text: `/start login_${token}` })
    await bot({ contact: { phone_number: phone, user_id: chatId } })

    // A new client: the page asks for a name, then goes where it was asked to.
    await expect(page.getByRole('heading', { name: 'Вы вошли' })).toBeVisible()
    await page.getByLabel('Имя').fill('E2E Telegram')
    await page.getByRole('button', { name: 'Готово' }).click()
    await expect(page).toHaveURL(/\/bookings$/)

    await withDb((client) =>
      client.query('DELETE FROM "client_telegram_chats" WHERE "phone" = $1', [phone]),
    )
  })

  test('unknown and malformed tokens open nothing', async ({ page, isMobile }) => {
    test.skip(isMobile, 'API only')
    const unknown = randomBytes(32).toString('base64url')
    expect(
      await (
        await page.request.post('/api/auth/telegram/check', { data: { token: unknown } })
      ).json(),
    ).toEqual({ status: 'expired' })
    expect(
      (await page.request.post('/api/auth/telegram', { data: { token: 'short' } })).status(),
    ).toBe(400)
  })
})
