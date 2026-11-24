import { expect, type Page, test } from '@playwright/test'
import { randomClientPhone, signInViaApi } from './account'
import { createOwnBusiness, createVisit, type OwnBusiness, type Visit } from './business'
import { API_URL } from './helpers'
import { withDb } from './visits'

type ManagedReview = {
  id: string
  authorName: string
  rating: number
  comment: string
  reply: string | null
  isAutoReply: boolean
  resolvedAt: string | null
}

// A visit of the test's own business, moved into the past and rated with the device's token.
const ratedVisit = async (
  business: OwnBusiness,
  name: string,
  daysBack: number,
  rating: number,
  comment = '',
) => {
  const visit: Visit = await createVisit({
    slug: business.slug,
    serviceId: business.service.id,
    specialistId: business.master.id,
    name,
    daysBack,
  })
  const response = await fetch(`${API_URL}/bookings/${visit.id}/review`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-booking-token': visit.token },
    body: JSON.stringify({ rating, comment }),
  })
  if (!response.ok) throw new Error(`Review failed: ${response.status} ${await response.text()}`)
  return visit
}

const QUICK_REPLY = 'Good to see you, {name}! The {service} went well'

// A new review reaches the owners' Telegram with buttons under it: a quick reply publishes at once,
// «Own reply» asks for words and the owner's reply to that prompt becomes the review's reply. Only
// a chat linked to the review's business may answer, and only while it has no reply. The bot has
// no token in tests: what Telegram would send is posted to the webhook.
const WEBHOOK_SECRET = 'e2e-webhook-secret'

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

// The owner taps «Connect Telegram», then «Start» in the bot.
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

const reviewsOf = async (page: Page, business: OwnBusiness) => {
  const summary = await (await page.request.get(`/api/manage/${business.slug}/reviews`)).json()
  return summary.items as ManagedReview[]
}

test.describe('Cabinet reviews', () => {
  test('“Review replies” keeps a new quick reply', async ({ page }) => {
    const business = await createOwnBusiness(page)
    await page.goto(`/manage/${business.slug}?tab=reviews`)
    await page.getByRole('button', { name: 'Review replies' }).click()
    const settings = page.getByRole('dialog', { name: 'Review replies' })
    // A fresh business starts with three quick replies.
    await expect(settings.getByRole('textbox', { name: /^Quick reply \d$/ })).toHaveCount(3)
    await settings.getByRole('button', { name: 'Add a reply' }).click()
    await settings.getByRole('textbox', { name: 'Quick reply 4' }).fill(QUICK_REPLY)
    await settings.getByRole('button', { name: 'Done' }).click()
    await expect(settings).toHaveCount(0)
    await expect(page.getByText('Saved')).toBeVisible()
    await expect
      .poll(async () => {
        const saved = await page.request.get(`/api/manage/${business.slug}/reviews/settings`)
        return (await saved.json()).quickReplies
      })
      .toEqual([expect.any(String), expect.any(String), expect.any(String), QUICK_REPLY])
  })

  test('poor reviews lead “Unanswered”; quick replies, “Resolved” and “Reply to all” answer them', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    const business = await createOwnBusiness(page)
    // Authors read as «E2E Q.», «E2E C.», «E2E U.»: one letter tells them apart.
    // The poor one is the oldest visit, so leading the list is its rating, not its date.
    await ratedVisit(business, 'E2E Unhappy', 3, 2, 'E2E Waited too long')
    await ratedVisit(business, 'E2E Chatty', 2, 5, 'E2E Loved everything')
    await ratedVisit(business, 'E2E Quiet', 1, 5, '')
    const readReviews = async () => {
      const summary = await (await page.request.get(`/api/manage/${business.slug}/reviews`)).json()
      const byLetter = (letter: string) =>
        (summary.items as ManagedReview[]).find((item) => item.authorName === `E2E ${letter}.`)
      return { quiet: byLetter('Q'), wordy: byLetter('C'), poor: byLetter('U') }
    }

    await page.goto(`/manage/${business.slug}?tab=reviews`)
    const tabs = page.getByRole('tablist', { name: 'Reviews and questions' })
    await expect(tabs.getByRole('tab', { name: /Unanswered/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(tabs.getByRole('tab', { name: /Unanswered/ })).toContainText('3')
    const reviews = page
      .getByRole('listitem')
      .filter({ has: page.getByLabel('Reply to the review') })
    await expect(reviews).toHaveCount(3)
    // Poor unsettled first, then the rest newest first.
    await expect(reviews.nth(0)).toContainText('E2E U.')
    await expect(reviews.nth(1)).toContainText('E2E Q.')
    await expect(reviews.nth(2)).toContainText('E2E C.')

    // A quick reply of the owner's own, with the client's and the service's names in it (the
    // sheet that saves it has a test of its own above).
    const defaults = await (
      await page.request.get(`/api/manage/${business.slug}/reviews/settings`)
    ).json()
    const saved = await page.request.put(`/api/manage/${business.slug}/reviews/settings`, {
      data: { ...defaults, quickReplies: [...defaults.quickReplies, QUICK_REPLY] },
    })
    expect(saved.ok()).toBe(true)
    await page.reload()

    const wordy = reviews.filter({ hasText: 'E2E C.' })
    await wordy.getByLabel('Reply to the review').click()
    const quick = wordy.getByRole('listbox', { name: 'Quick replies' })
    await quick.getByRole('option', { name: 'Good to see you, E2E! The haircut went well' }).click()
    await expect(wordy.getByLabel('Reply to the review')).toHaveValue(
      'Good to see you, E2E! The haircut went well',
    )
    await wordy.getByRole('button', { name: 'Send reply' }).click()
    await expect(page.getByText('Reply published')).toBeVisible()
    await expect
      .poll(async () => (await readReviews()).wordy?.reply)
      .toBe('Good to see you, E2E! The haircut went well')

    // The poor one is settled in person: «Resolved» is pressed and saved.
    const poor = reviews.filter({ hasText: 'E2E U.' })
    await poor.getByRole('button', { name: 'Resolved' }).click()
    await expect(poor.getByRole('button', { name: 'Resolved' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect.poll(async () => (await readReviews()).poor?.resolvedAt).not.toBeNull()

    // «Reply to all» thanks only the good rating left without words.
    await page.getByRole('button', { name: /^Reply to all: 1 rating without text/ }).click()
    const quiet = page.getByRole('dialog', { name: 'Reply to all' })
    await expect(quiet).toContainText('The reply goes to 1 review without text')
    await quiet.getByRole('button', { name: 'Send' }).click()
    await expect(page.getByText('Replied to 1 review')).toBeVisible()
    const after = await readReviews()
    // The default template, filled with this client's first name.
    expect(after.quiet).toMatchObject({
      reply: expect.stringContaining('Thank you, E2E!'),
      isAutoReply: true,
    })
    expect(after.wordy).toMatchObject({
      reply: 'Good to see you, E2E! The haircut went well',
      isAutoReply: false,
    })
    expect(after.poor?.reply).toBeNull()
  })

  test('staff use the quick replies but cannot change them, answer all or set the goal', async ({
    page,
    browser,
  }) => {
    test.setTimeout(60_000)
    const business = await createOwnBusiness(page)
    await ratedVisit(business, 'E2E Quiet', 1, 5, '')
    const staffPhone = randomClientPhone()
    expect(
      (
        await page.request.post(`/api/manage/${business.slug}/members`, {
          data: { phone: staffPhone },
        })
      ).ok(),
    ).toBe(true)

    const staffContext = await browser.newContext()
    const staff = await staffContext.newPage()
    try {
      await signInViaApi(staff, staffPhone, 'E2E Salon Admin')
      const settings = await staff.request.get(`/api/manage/${business.slug}/reviews/settings`)
      expect(settings.status()).toBe(200)
      expect((await settings.json()).quickReplies.length).toBeGreaterThan(0)
      const put = await staff.request.put(`/api/manage/${business.slug}/reviews/settings`, {
        data: { autoReply: { isEnabled: false, minRating: 5, template: 'x' }, quickReplies: [] },
      })
      expect(put.status()).toBe(403)
      const bulk = await staff.request.post(`/api/manage/${business.slug}/reviews/bulk-reply`, {
        data: { minRating: 5, template: 'E2E thank you' },
      })
      expect(bulk.status()).toBe(403)
      const goal = await staff.request.put(`/api/manage/${business.slug}/analytics/goal`, {
        data: { goal: 50_000 },
      })
      expect(goal.status()).toBe(403)

      // In the tab: the review with its field and the quick replies, no owner's tools.
      await staff.goto(`/manage/${business.slug}?tab=reviews`)
      const field = staff.getByLabel('Reply to the review')
      await field.click()
      await expect(staff.getByRole('listbox', { name: 'Quick replies' })).toBeVisible()
      await expect(staff.getByRole('button', { name: 'Review replies' })).toHaveCount(0)
      await expect(staff.getByRole('button', { name: /^Reply to all/ })).toHaveCount(0)
    } finally {
      await staffContext.close()
    }
    // Nothing was answered on the staff's behalf.
    const summary = await (await page.request.get(`/api/manage/${business.slug}/reviews`)).json()
    expect(summary.items[0].reply).toBeNull()
  })
})

test.describe('Answering reviews from the owners’ Telegram', () => {
  test('quick reply and “Own reply” publish once, from a chat of this business only', async ({
    page,
    browser,
    isMobile,
  }) => {
    test.skip(isMobile, 'API only')
    test.setTimeout(90_000)
    const business = await createOwnBusiness(page)
    await ratedVisit(business, 'E2E Timur', 2, 5)
    await ratedVisit(business, 'E2E Asel', 1, 4)
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
    const quick = reviews.find((review) => review.authorName === 'E2E T.')
    const own = reviews.find((review) => review.authorName === 'E2E A.')
    if (!quick || !own) throw new Error('Reviews not found')
    const replyOf = async (id: string) =>
      (await reviewsOf(page, business)).find((review) => review.id === id)?.reply ?? null

    // A chat of another business presses the first quick reply: nothing is published.
    await press(page, strangerChat, `rq:${quick.id}:0`)
    expect(await replyOf(quick.id)).toBeNull()

    // The business's own chat: the first default quick reply, with the client's first name.
    await press(page, ownChat, `rq:${quick.id}:0`)
    expect(await replyOf(quick.id)).toBe('Thank you, E2E! See you again soon 🙏')

    // An old message's other button changes nothing: the review already has its reply.
    await press(page, ownChat, `rq:${quick.id}:1`)
    expect(await replyOf(quick.id)).toBe('Thank you, E2E! See you again soon 🙏')

    // «Own reply»: the bot would send a prompt; without a token it is not sent, so the prompt the
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

    await answer(strangerChat, 502, 'E2E Stranger reply')
    expect(await replyOf(own.id)).toBeNull()

    await answer(ownChat, 501, '  E2E Thanks, Asel, see you again!  ')
    expect(await replyOf(own.id)).toBe('E2E Thanks, Asel, see you again!')
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
