import { expect, test } from '@playwright/test'
import { randomClientPhone, signInViaApi } from './account'
import { API_URL, clickUntilUrl } from './helpers'
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
    await expect(page.getByText(/Level 1/).first()).toBeVisible()
    // Laid out like Telegram: the tiles, then the sections as tabs, medals first; with nothing
    // earned yet the goals are shown open with their progress.
    await expect(page.getByRole('button', { name: 'Invite' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Change', exact: true })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Medals/ })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('list', { name: 'Goals' })).toBeVisible()

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
    await expect(page.getByText('Profile hidden: only you can see it')).toBeVisible()

    // “Change” on one's own page opens the editor with the live preview.
    await page.getByRole('button', { name: 'Change', exact: true }).click()
    const sheet = page.getByRole('dialog', { name: 'Profile' })
    await expect(sheet.getByRole('combobox', { name: 'Profile colour' })).toContainText('Pink')
    // The status emoji is a plain Select row now; it shows the saved one.
    await expect(sheet.getByRole('combobox', { name: 'Status emoji' })).toContainText('💅')
    await sheet.getByText('Public profile', { exact: true }).click()
    await sheet.getByRole('button', { name: 'Done' }).click()
    await expect(page.getByText('Profile updated')).toBeVisible()
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
    await expect(page.getByRole('button', { name: 'Invite' })).toBeVisible()
    // “To stories” shows the picture first, with a download for a mouse.
    await page.getByRole('button', { name: 'To stories' }).click()
    const storySheet = page.getByRole('dialog', { name: 'For stories' })
    await expect(
      storySheet.getByRole('img', { name: 'Your profile card for stories' }),
    ).toBeVisible()
    // Saving it is one glyph in the sheet's bar (a download with a mouse).
    await expect(storySheet.getByRole('button', { name: 'Download picture' })).toBeVisible()
    await storySheet.getByRole('button', { name: 'Close', exact: true }).click()

    // A friend books by the link: once they have come, they count - points and “Brought a friend”.
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

test.describe('Profile story', () => {
  test('medals carry when they came, the year counts visits, masters and places their history', async ({
    page,
    request,
  }) => {
    const phone = randomClientPhone()
    await signInViaApi(page, phone)
    // Two past visits: a medal earned, a month lit, a master and a place with their last visit.
    await createPastVisit('E2E Профиль', phone, 0, 5)
    await createPastVisit('E2E Профиль', phone, 1, 40)
    const settings = await (await page.request.get('/api/me/profile')).json()
    const profile = await (await request.get(`${API_URL}/profiles/${settings.id}`)).json()

    expect(profile.activity).toHaveLength(12)
    expect(
      profile.activity.reduce((sum: number, month: { visits: number }) => sum + month.visits, 0),
    ).toBe(2)
    const first = profile.achievements.find((item: { id: string }) => item.id === 'first-visit')
    expect(first.earnedAt).toEqual(expect.any(String))
    expect(profile.masters[0]?.lastVisitAt ?? profile.places[0]?.lastVisitAt).toEqual(
      expect.any(String),
    )

    // On the page: the earned medal on the shelf, the goals folded into one line that opens.
    await page.goto(`/u/${settings.id}`)
    await expect(page.getByRole('list', { name: 'Earned' })).toContainText('First visit')
    const goals = page.getByRole('button', { name: /goals.*closest/ })
    await goals.click()
    await expect(page.getByRole('list', { name: 'Goals' })).toBeVisible()
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

    // The author's name on the business page opens that profile as a sheet over the page, like a
    // booking; “Close” goes back to the place.
    await page.goto(`/${found.slug}`)
    await clickUntilUrl(
      page,
      page.getByRole('link', { name: `${found.review.authorName}: profile` }).first(),
      new RegExp(`/u/${found.review.authorId}$`),
    )
    const sheet = page.getByRole('dialog', { name: 'Profile' })
    await expect(sheet.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(sheet.getByText(/Level \d+/).first()).toBeVisible()
    await sheet.getByRole('button', { name: 'Close', exact: true }).click()
    await page.waitForURL(new RegExp(`/${found.slug}$`))
    await expect(page.getByRole('dialog', { name: 'Profile' })).toHaveCount(0)

    // The address itself (a shared link, a reload) is the full page, no sheet.
    await page.goto(`/u/${found.review.authorId}`)
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('dialog', { name: 'Profile' })).toHaveCount(0)
  })
})
