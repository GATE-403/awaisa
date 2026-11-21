import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { adminPhone, randomClientPhone, signInViaApi } from './account'
import { expectGoodDesign } from './design'

const SLUG = 'awaisa-studio'

// 16×10 px PNG; the API re-encodes it as WebP.
const TINY_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAKCAIAAAAy3EnLAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAFUlEQVQYlWNgKHxMGmIY1fB4KIYSAN5g1IFgp8jzAAAAAElFTkSuQmCC'

type WorkPhoto = { id: string; url: string; isHidden: boolean }

// Reports are records a platform admin works through at /moderation.
test.describe('Moderation', () => {
  test('three reports hide a work photo, the admin keeps it and it stays; others get «not found»', async ({
    page,
    browser,
    isMobile,
  }, testInfo) => {
    test.skip(isMobile, 'Runs once: it adds a photo to the business')
    test.setTimeout(90_000)

    // The page streams (PPR): the refusal is the «not found» page, not a status code.
    await signInViaApi(page, randomClientPhone())
    await page.goto('/moderation')
    await expect(page.getByRole('heading', { name: /Не нашли/ })).toBeVisible()
    expect((await page.request.get('/api/moderation/queue')).status()).toBe(403)
    await page.context().clearCookies()

    await signInViaApi(page, adminPhone(testInfo), 'E2E Модератор')
    const manage = `/api/manage/${SLUG}`
    const before: WorkPhoto[] = await (await page.request.get(`${manage}/work-photos`)).json()
    const uploaded = await page.request.post(`${manage}/photos`, {
      multipart: {
        file: { name: 'work.png', mimeType: 'image/png', buffer: Buffer.from(TINY_PNG, 'base64') },
      },
    })
    expect(uploaded.ok()).toBe(true)
    const after: WorkPhoto[] = await (await page.request.get(`${manage}/work-photos`)).json()
    const photo = after.find((item) => !before.some((known) => known.id === item.id))
    expect(photo).toBeTruthy()
    if (!photo) return
    const viewers = await browser.newContext()
    const report = (session: string) =>
      viewers.request.post('/api/reports', {
        data: { targetType: 'photo', targetId: photo.id, reason: 'spam', session },
      })
    const isInFeed = async () => {
      const feed = await (await viewers.request.get(`/api/feed?business=${SLUG}`)).json()
      return feed.items.some((item: { id: string }) => item.id === photo.id)
    }

    try {
      // Unknown things and malformed ids are refused; the same device counts once.
      const missing = await viewers.request.post('/api/reports', {
        data: {
          targetType: 'photo',
          targetId: '00000000-0000-4000-8000-000000000000',
          reason: 'spam',
          session: 'e2e-moderation-missing',
        },
      })
      expect(missing.status()).toBe(404)
      const malformed = await viewers.request.post('/api/reports', {
        data: { targetType: 'profile', targetId: 'nope', reason: 'spam', session: 'e2e-x-12345' },
      })
      expect(malformed.status()).toBe(400)
      const tag = photo.id.slice(0, 8)
      expect((await report(`e2e-mod-${tag}-1`)).status()).toBe(204)
      expect((await report(`e2e-mod-${tag}-1`)).status()).toBe(204)
      expect((await report(`e2e-mod-${tag}-2`)).status()).toBe(204)
      expect(await isInFeed()).toBe(true)

      // The third reporter takes it out of the feed.
      expect((await report(`e2e-mod-${tag}-3`)).status()).toBe(204)
      expect(await isInFeed()).toBe(false)

      await page.goto('/moderation')
      const queue = page.getByRole('list', { name: 'Жалобы' })
      const row = queue
        .getByRole('listitem')
        .filter({ has: page.locator(`img[src="${photo.url}"]`) })
      await expect(row).toContainText('3 жалобы')
      await expect(row).toContainText('Спам или реклама 3')
      await expect(row).toContainText('Скрыто, пока вы не решите')
      await test.step('design and accessibility of the queue', async () => {
        await expectGoodDesign(page, 'main')
        const { violations } = await new AxeBuilder({ page })
          .include('main')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze()
        expect(
          violations
            .filter((item) => item.impact === 'serious' || item.impact === 'critical')
            .map((item) => item.id),
        ).toEqual([])
      })
      await row.getByRole('button', { name: 'Оставить' }).click()
      await expect(row).toHaveCount(0)

      await page.getByRole('tab', { name: 'Журнал' }).click()
      await expect(
        page.getByRole('list', { name: 'Журнал решений' }).getByRole('listitem').first(),
      ).toContainText('Оставлено')

      expect(await isInFeed()).toBe(true)
      const shown: WorkPhoto[] = await (await page.request.get(`${manage}/work-photos`)).json()
      expect(shown.find((item) => item.id === photo.id)).toMatchObject({ isHidden: false })

      // Kept: new reports reach the queue, but the photo no longer hides by itself.
      for (const session of ['4', '5', '6']) {
        expect((await report(`e2e-mod-${tag}-${session}`)).status()).toBe(204)
      }
      expect(await isInFeed()).toBe(true)
      const queued = await (await page.request.get('/api/moderation/queue')).json()
      expect(
        queued.items.find((item: { targetId: string }) => item.targetId === photo.id),
      ).toMatchObject({ reports: 3, isKept: true, isHidden: false })
    } finally {
      await viewers.close()
      await page.request.delete(`${manage}/work-photos/${photo.id}`)
    }
  })
})
