import { expect, type Page, test } from '@playwright/test'
import { createOwnBusiness, createVisit, type OwnBusiness } from './business'
import { API_URL } from './helpers'
import { withDb } from './visits'

// A new review reaches the owners' Telegram with buttons under it: a quick reply publishes at once,
// «Свой ответ» asks for words and the owner's reply to that prompt becomes the review's reply. Only
// a chat linked to the review's business may answer, and only while it has no reply. The bot has
// no token in tests: what Telegram would send is posted to the webhook.
const WEBHOOK_SECRET = 'e2e-webhook-secret'

type ManagedReview = { id: string; authorName: string; reply: string | null }

let updateId = 0

const sendUpdate = async (page: Page, update: Record<string, unknown>) => {
  updateId += 1
  const response = await page.request.post(`${API_URL}/telegram/webhook`, {
    data: { update_id: updateId, ...update },
    headers: { 'x-telegram-bot-api-secret-token': WEBHOOK_SECRET },
  })
  expect(response.ok()).toBe(true)
}

const randomChat = () => 7_000_000_000 + Math.floor(Math.random() * 900_000_000)

// The owner taps «Подключить Telegram», then «Start» in the bot.
const linkChat = async (page: Page, business: OwnBusiness, chatId: number) => {
  const link = await (await page.request.post(`/api/manage/${business.slug}/telegram/link`)).json()
  await sendUpdate(page, {
    message: { text: `/start ${link.code}`, chat: { id: chatId }, from: { username: 'e2e_owner' } },
  })
}

const press = (page: Page, chatId: number, data: string) =>
  sendUpdate(page, {
    callback_query: {
      id: `e2e-${updateId}`,
      data,
      message: { message_id: 1, chat: { id: chatId } },
    },
  })

const ratedVisit = async (
  business: OwnBusiness,
  name: string,
  daysBack: number,
  rating: number,
) => {
  const visit = await createVisit({
    slug: business.slug,
    serviceId: business.service.id,
    specialistId: business.master.id,
    name,
    daysBack,
  })
  const response = await fetch(`${API_URL}/bookings/${visit.id}/review`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-booking-token': visit.token },
    body: JSON.stringify({ rating, comment: '' }),
  })
  if (!response.ok) throw new Error(`Review failed: ${response.status} ${await response.text()}`)
}

const reviewsOf = async (page: Page, business: OwnBusiness) => {
  const summary = await (await page.request.get(`/api/manage/${business.slug}/reviews`)).json()
  return summary.items as ManagedReview[]
}

test.describe('Answering reviews from the owners’ Telegram', () => {
  test('quick reply and «Свой ответ» publish once, from a chat of this business only', async ({
    page,
    browser,
    isMobile,
  }) => {
    test.skip(isMobile, 'API only')
    test.setTimeout(90_000)
    const business = await createOwnBusiness(page)
    await ratedVisit(business, 'E2E Тимур', 2, 5)
    await ratedVisit(business, 'E2E Асель', 1, 4)
    const ownChat = randomChat()
    await linkChat(page, business, ownChat)

    // Another owner's business and chat.
    const otherContext = await browser.newContext()
    const other = await otherContext.newPage()
    const strangerChat = randomChat()
    try {
      const otherBusiness = await createOwnBusiness(other)
      await linkChat(other, otherBusiness, strangerChat)
    } finally {
      await otherContext.close()
    }

    const reviews = await reviewsOf(page, business)
    const quick = reviews.find((review) => review.authorName === 'E2E Т.')
    const own = reviews.find((review) => review.authorName === 'E2E А.')
    if (!quick || !own) throw new Error('Reviews not found')
    const replyOf = async (id: string) =>
      (await reviewsOf(page, business)).find((review) => review.id === id)?.reply ?? null

    // A chat of another business presses the first quick reply: nothing is published.
    await press(page, strangerChat, `rq:${quick.id}:0`)
    expect(await replyOf(quick.id)).toBeNull()

    // The business's own chat: the first default quick reply, with the client's first name.
    await press(page, ownChat, `rq:${quick.id}:0`)
    expect(await replyOf(quick.id)).toBe('Спасибо, E2E! Ждём вас снова 🙏')

    // An old message's other button changes nothing: the review already has its reply.
    await press(page, ownChat, `rq:${quick.id}:1`)
    expect(await replyOf(quick.id)).toBe('Спасибо, E2E! Ждём вас снова 🙏')

    // «Свой ответ»: the bot would send a prompt; without a token it is not sent, so the prompt the
    // bot would have remembered is put in place for both chats.
    await withDb((client) =>
      client.query(
        `INSERT INTO "telegram_reply_prompts" ("chat_id", "message_id", "review_id")
         VALUES ($1, 501, $3), ($2, 502, $3)`,
        [String(ownChat), String(strangerChat), own.id],
      ),
    )
    const answer = (chatId: number, promptId: number, text: string) =>
      sendUpdate(page, {
        message: {
          message_id: promptId + 100,
          text,
          chat: { id: chatId },
          reply_to_message: { message_id: promptId },
        },
      })

    await answer(strangerChat, 502, 'E2E Чужой ответ')
    expect(await replyOf(own.id)).toBeNull()

    await answer(ownChat, 501, '  E2E Спасибо, Асель, ждём снова!  ')
    expect(await replyOf(own.id)).toBe('E2E Спасибо, Асель, ждём снова!')
    // The prompt is used up with the reply.
    const left = await withDb(
      async (client) =>
        (
          await client.query(
            'SELECT COUNT(*)::int AS "count" FROM "telegram_reply_prompts" WHERE "review_id" = $1',
            [own.id],
          )
        ).rows[0]?.count,
    )
    expect(left).toBe(0)
  })
})
