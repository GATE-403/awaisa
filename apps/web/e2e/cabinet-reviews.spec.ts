import { expect, test } from '@playwright/test'
import { randomClientPhone, signInViaApi } from './account'
import { createOwnBusiness, createVisit, type OwnBusiness, type Visit } from './business'
import { API_URL } from './helpers'

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
  comment: string,
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

const QUICK_REPLY = 'Рады видеть, {имя}! {услуга} удалась'

test.describe('Cabinet reviews', () => {
  test('«Ответы на отзывы» keeps a new quick reply', async ({ page }) => {
    const business = await createOwnBusiness(page)
    await page.goto(`/manage/${business.slug}?tab=reviews`)
    await page.getByRole('button', { name: 'Ответы на отзывы' }).click()
    const settings = page.getByRole('dialog', { name: 'Ответы на отзывы' })
    // A fresh business starts with three quick replies.
    await expect(settings.getByRole('textbox', { name: /^Быстрый ответ \d$/ })).toHaveCount(3)
    await settings.getByRole('button', { name: 'Добавить ответ' }).click()
    await settings.getByRole('textbox', { name: 'Быстрый ответ 4' }).fill(QUICK_REPLY)
    await settings.getByRole('button', { name: 'Готово' }).click()
    await expect(settings).toHaveCount(0)
    await expect(page.getByText('Сохранено')).toBeVisible()
    await expect
      .poll(async () => {
        const saved = await page.request.get(`/api/manage/${business.slug}/reviews/settings`)
        return (await saved.json()).quickReplies
      })
      .toEqual([expect.any(String), expect.any(String), expect.any(String), QUICK_REPLY])
  })

  test('poor reviews lead «Без ответа»; quick replies, «Решено» and «Ответить всем» answer them', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    const business = await createOwnBusiness(page)
    // Authors read as «E2E Т.», «E2E Б.», «E2E Н.»: one letter tells them apart.
    // The poor one is the oldest visit, so leading the list is its rating, not its date.
    await ratedVisit(business, 'E2E Недоволен', 3, 2, 'E2E Долго ждал')
    await ratedVisit(business, 'E2E Болтун', 2, 5, 'E2E Всё понравилось')
    await ratedVisit(business, 'E2E Тихая', 1, 5, '')
    const readReviews = async () => {
      const summary = await (await page.request.get(`/api/manage/${business.slug}/reviews`)).json()
      const byLetter = (letter: string) =>
        (summary.items as ManagedReview[]).find((item) => item.authorName === `E2E ${letter}.`)
      return { quiet: byLetter('Т'), wordy: byLetter('Б'), poor: byLetter('Н') }
    }

    await page.goto(`/manage/${business.slug}?tab=reviews`)
    const tabs = page.getByRole('tablist', { name: 'Отзывы и вопросы' })
    await expect(tabs.getByRole('tab', { name: /Без ответа/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(tabs.getByRole('tab', { name: /Без ответа/ })).toContainText('3')
    const reviews = page.getByRole('listitem').filter({ has: page.getByLabel('Ответ на отзыв') })
    await expect(reviews).toHaveCount(3)
    // Poor unsettled first, then the rest newest first.
    await expect(reviews.nth(0)).toContainText('E2E Н.')
    await expect(reviews.nth(1)).toContainText('E2E Т.')
    await expect(reviews.nth(2)).toContainText('E2E Б.')

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

    const wordy = reviews.filter({ hasText: 'E2E Б.' })
    await wordy.getByLabel('Ответ на отзыв').click()
    const quick = wordy.getByRole('listbox', { name: 'Быстрые ответы' })
    await quick.getByRole('option', { name: 'Рады видеть, E2E! стрижка удалась' }).click()
    await expect(wordy.getByLabel('Ответ на отзыв')).toHaveValue(
      'Рады видеть, E2E! стрижка удалась',
    )
    await wordy.getByRole('button', { name: 'Отправить ответ' }).click()
    await expect(page.getByText('Ответ опубликован')).toBeVisible()
    await expect
      .poll(async () => (await readReviews()).wordy?.reply)
      .toBe('Рады видеть, E2E! стрижка удалась')

    // The poor one is settled in person: «Решено» is pressed and saved.
    const poor = reviews.filter({ hasText: 'E2E Н.' })
    await poor.getByRole('button', { name: 'Решено' }).click()
    await expect(poor.getByRole('button', { name: 'Решено' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect.poll(async () => (await readReviews()).poor?.resolvedAt).not.toBeNull()

    // «Ответить всем» thanks only the good rating left without words.
    await page.getByRole('button', { name: /^Ответить всем: 1 оценка без текста/ }).click()
    const quiet = page.getByRole('dialog', { name: 'Ответить всем' })
    await expect(quiet).toContainText('Ответ получат 1 отзыв без текста')
    await quiet.getByRole('button', { name: 'Отправить' }).click()
    await expect(page.getByText('Ответили на 1 отзыв')).toBeVisible()
    const after = await readReviews()
    // The default template, filled with this client's first name.
    expect(after.quiet).toMatchObject({
      reply: expect.stringContaining('Спасибо, E2E!'),
      isAutoReply: true,
    })
    expect(after.wordy).toMatchObject({
      reply: 'Рады видеть, E2E! стрижка удалась',
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
    await ratedVisit(business, 'E2E Тихая', 1, 5, '')
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
      await signInViaApi(staff, staffPhone, 'E2E Админ Салона')
      const settings = await staff.request.get(`/api/manage/${business.slug}/reviews/settings`)
      expect(settings.status()).toBe(200)
      expect((await settings.json()).quickReplies.length).toBeGreaterThan(0)
      const put = await staff.request.put(`/api/manage/${business.slug}/reviews/settings`, {
        data: { autoReply: { isEnabled: false, minRating: 5, template: 'x' }, quickReplies: [] },
      })
      expect(put.status()).toBe(403)
      const bulk = await staff.request.post(`/api/manage/${business.slug}/reviews/bulk-reply`, {
        data: { minRating: 5, template: 'E2E спасибо' },
      })
      expect(bulk.status()).toBe(403)
      const goal = await staff.request.put(`/api/manage/${business.slug}/analytics/goal`, {
        data: { goal: 50_000 },
      })
      expect(goal.status()).toBe(403)

      // In the tab: the review with its field and the quick replies, no owner's tools.
      await staff.goto(`/manage/${business.slug}?tab=reviews`)
      const field = staff.getByLabel('Ответ на отзыв')
      await field.click()
      await expect(staff.getByRole('listbox', { name: 'Быстрые ответы' })).toBeVisible()
      await expect(staff.getByRole('button', { name: 'Ответы на отзывы' })).toHaveCount(0)
      await expect(staff.getByRole('button', { name: /^Ответить всем/ })).toHaveCount(0)
    } finally {
      await staffContext.close()
    }
    // Nothing was answered on the staff's behalf.
    const summary = await (await page.request.get(`/api/manage/${business.slug}/reviews`)).json()
    expect(summary.items[0].reply).toBeNull()
  })
})
