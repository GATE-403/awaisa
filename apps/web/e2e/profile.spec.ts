import { expect, test } from '@playwright/test'
import { randomClientPhone, signInViaApi } from './account'
import { createPastVisit, withDb } from './visits'

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
      },
    })
    expect(saved.ok()).toBe(true)
    await page.goto(`/u/${settings.id}`)
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
