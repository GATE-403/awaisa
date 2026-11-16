import { randomBytes } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { randomClientPhone } from './account'
import { API_URL } from './helpers'
import { withDb } from './visits'

const WEBHOOK_SECRET = 'e2e-webhook-secret'

// «Войти через Telegram»: the page's token, the bot's /start, the person's own number shared
// in the chat, then the page's check opens a session on that number.
test.describe('Sign-in through the Telegram bot', () => {
  test('a shared number signs the page in once; a forwarded one does not', async ({ page }) => {
    const config = await (await page.request.get('/api/auth/telegram')).json()
    expect(config).toEqual({ isAvailable: true, botUsername: 'awaisa_e2e_bot' })

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

    await withDb(async (client) => {
      await client.query('DELETE FROM "client_telegram_chats" WHERE "phone" = $1', [phone])
      await client.query('UPDATE "customers" SET "name" = $2 WHERE "phone" = $1', [
        phone,
        'E2E Telegram',
      ])
    })
  })

  test('unknown and malformed tokens open nothing', async ({ page }) => {
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
