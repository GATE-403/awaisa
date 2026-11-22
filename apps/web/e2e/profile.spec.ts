import { expect, test } from '@playwright/test'
import { randomClientPhone, signInViaApi } from './account'
import { API_URL } from './helpers'
import { createPastVisit, withDb } from './visits'

type Summary = { items: { authorId: string | null; authorName: string; serviceId: string }[] }

// Any published place with reviews will do: the demo data has plenty.
const findReviewedPlace = async (request: import('@playwright/test').APIRequestContext) => {
  const places = (await (await request.get(`${API_URL}/businesses?limit=60`)).json()) as {
    slug: string
    reviewCount?: number
  }[]
  for (const place of places) {
    const summary = (await (
      await request.get(`${API_URL}/businesses/${place.slug}/reviews?limit=3`)
    ).json()) as Summary
    const review = summary.items.find((item) => item.authorId)
    if (review) return { slug: place.slug, review }
  }
  return null
}

test.describe('Own profile', () => {
  test('a client styles their profile, shares it, and can hide it', async ({ page, browser }) => {
    await signInViaApi(page, randomClientPhone())
    const settings = await (await page.request.get('/api/me/profile')).json()
    expect(settings.id).toMatch(/^[0-9a-f]{20}$/)

    // The look and a status, then the public page shows them.
    const saved = await page.request.patch('/api/me/profile', {
      data: {
        banner: 'sunset',
        accent: 'pink',
        status: 'E2E статус',
        statusEmoji: '💅',
        about: 'E2E о себе',
        featuredBadges: ['first-visit'],
        favoriteMasterId: null,
        // A pasted link and «@name» both become handles; the page builds the addresses.
        links: { instagram: 'https://www.instagram.com/e2e.nails/?hl=ru', telegram: '@e2e_tester' },
      },
    })
    expect(saved.ok()).toBe(true)
    expect((await saved.json()).links).toEqual({ instagram: 'e2e.nails', telegram: 'e2e_tester' })
    expect(
      (
        await page.request.patch('/api/me/profile', { data: { links: { telegram: 'ab' } } })
      ).status(),
    ).toBe(400)
    await page.goto(`/u/${settings.id}`)
    await expect(page.getByRole('link', { name: 'Instagram: @e2e.nails' })).toHaveAttribute(
      'href',
      'https://instagram.com/e2e.nails',
    )
    await expect(page.getByRole('link', { name: 'Telegram: @e2e_tester' })).toBeVisible()
    await expect(page.getByText('E2E статус')).toBeVisible()
    await expect(page.getByText('💅').first()).toBeVisible()
    await expect(page.getByText('E2E о себе')).toBeVisible()
    await expect(page.getByText(/Уровень 1/).first()).toBeVisible()
    // Achievements: every goal is listed, the ones not reached with progress.
    await expect(page.getByText('Достижения')).toBeVisible()
    await expect(page.getByText('0 из 10').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Пригласить' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Оформление' })).toBeVisible()

    // Bad presets and a status «emoji» that is not one are refused.
    expect(
      (await page.request.patch('/api/me/profile', { data: { banner: 'neon' } })).status(),
    ).toBe(400)
    expect(
      (await page.request.patch('/api/me/profile', { data: { statusEmoji: 'abc' } })).status(),
    ).toBe(400)
    expect(
      (
        await page.request.patch('/api/me/profile', {
          data: { featuredBadges: ['a', 'b', 'c', 'd'] },
        })
      ).status(),
    ).toBe(400)

    // Hidden: others get 404, the owner still sees it with a note.
    await page.request.patch('/api/me/profile', { data: { isPublic: false } })
    const guest = await browser.newContext()
    expect(
      (
        await guest.request.get(`${page.url().split('/u/')[0]}/api/profiles/${settings.id}`)
      ).status(),
    ).toBe(404)
    await guest.close()
    await page.reload()
    await expect(page.getByText('Профиль скрыт — его видите только вы')).toBeVisible()

    // «Оформление» on one's own page opens the editor with the live preview.
    await page.getByRole('button', { name: 'Оформление' }).click()
    const sheet = page.getByRole('dialog', { name: 'Профиль' })
    await expect(sheet.getByRole('radio', { name: 'Розовый' })).toBeChecked()
    await expect(sheet.getByRole('radio', { name: 'Эмодзи 💅' })).toBeChecked()
    await sheet.getByText('Открытый профиль', { exact: true }).click()
    await sheet.getByRole('button', { name: 'Готово' }).click()
    await expect(page.getByText('Профиль обновлён')).toBeVisible()
    const after = await (await page.request.get('/api/me/profile')).json()
    expect(after.isPublic).toBe(true)
  })

  test('a short address, an invitation that counts a friend, and a story card', async ({
    page,
    request,
  }) => {
    await signInViaApi(page, randomClientPhone())
    const handle = `e2e${Date.now().toString(36)}`
    expect(
      (await page.request.patch('/api/me/profile', { data: { handle: 'Admin' } })).status(),
    ).toBe(409)
    expect(
      (await page.request.patch('/api/me/profile', { data: { handle: 'a b' } })).status(),
    ).toBe(400)
    expect((await page.request.patch('/api/me/profile', { data: { handle } })).ok()).toBe(true)

    // The short address opens the profile; on one's own it invites.
    await page.goto(`/u/${handle}`)
    await expect(page.getByRole('button', { name: 'Пригласить' })).toBeVisible()
    // «В сторис» shows the picture first, with a download for a mouse.
    await page.getByRole('button', { name: 'В сторис' }).click()
    const storySheet = page.getByRole('dialog', { name: 'Для сторис' })
    await expect(storySheet.getByRole('img', { name: 'Картинка профиля для сторис' })).toBeVisible()
    await expect(storySheet.getByRole('link', { name: 'Скачать картинку' })).toHaveAttribute(
      'download',
      /\.png$/,
    )
    await storySheet.getByRole('button', { name: 'Закрыть' }).click()

    // A friend books by the link: once they have come, they count — points and «Привёл друга».
    const friendPhone = randomClientPhone()
    await createPastVisit('E2E Друг', friendPhone, 0, undefined, handle)
    await expect
      .poll(async () => (await (await request.get(`/api/profiles/${handle}`)).json()).friends, {
        timeout: 10_000,
      })
      .toBe(1)
    const profile = await (await request.get(`/api/profiles/${handle}`)).json()
    expect(profile.achievements.find((item: { id: string }) => item.id === 'friend').earned).toBe(
      true,
    )

    // The story card is a 9:16 picture.
    const story = await request.get(`/u/${handle}/story`)
    expect(story.ok()).toBe(true)
    expect(story.headers()['content-type']).toContain('image/png')

    await withDb((client) =>
      client.query('DELETE FROM "referrals" WHERE "friend_phone" = $1', [friendPhone]),
    )
  })
})

test.describe('Client profiles', () => {
  test('a review leads to its author’s profile with their reviews', async ({ page, request }) => {
    const found = await findReviewedPlace(request)
    test.skip(!found, 'No reviews in this database')
    if (!found) return

    const profile = await request.get(`${API_URL}/reviewers/${found.review.authorId}`)
    expect(profile.ok()).toBe(true)
    const body = (await profile.json()) as { name: string; count: number; items: unknown[] }
    expect(body.name).toBe(found.review.authorName)
    expect(body.items.length).toBe(Math.min(body.count, 50))
    // The id never gives the phone away and a made-up one finds nobody.
    expect(JSON.stringify(body)).not.toMatch(/\+996/)
    expect((await request.get(`${API_URL}/reviewers/0000000000000000beef`)).status()).toBe(404)
    expect((await request.get(`${API_URL}/reviewers/not-an-id`)).status()).toBe(404)

    const own = (await (
      await request.get(
        `${API_URL}/businesses/${found.slug}/reviews?serviceId=${found.review.serviceId}`,
      )
    ).json()) as Summary
    expect(own.items.every((item) => item.serviceId === found.review.serviceId)).toBe(true)

    // The same id opens a public profile with level and badges.
    const page2 = await request.get(`${API_URL}/profiles/${found.review.authorId}`)
    expect(page2.ok()).toBe(true)
    const publicProfile = (await page2.json()) as { level: { level: number } }
    expect(publicProfile.level.level).toBeGreaterThanOrEqual(1)
    expect((await request.get(`${API_URL}/profiles/0000000000000000beef`)).status()).toBe(404)

    // Laurel wreaths: at most three ranked masters on the platform, ranks 1–3.
    const place = (await (await request.get(`${API_URL}/businesses/${found.slug}`)).json()) as {
      catalog: { specialists: { rank?: number | null }[] }
    }
    for (const master of place.catalog.specialists) {
      expect([null, 1, 2, 3]).toContain(master.rank ?? null)
    }

    // The author's name on the business page leads to that profile.
    await page.goto(`/${found.slug}`)
    await page
      .getByRole('link', { name: `${found.review.authorName}: профиль` })
      .first()
      .click()
    await page.waitForURL(new RegExp(`/u/${found.review.authorId}$`))
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText(/Уровень \d+/).first()).toBeVisible()
  })
})
