import { expect, test } from '@playwright/test'
import { adminPhone, signInViaApi } from './account'

const SLUG = 'awaisa-studio'

// 16×10 px PNG; the API re-encodes it as WebP.
const TINY_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAKCAIAAAAy3EnLAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAFUlEQVQYlWNgKHxMGmIY1fB4KIYSAN5g1IFgp8jzAAAAAElFTkSuQmCC'

type WorkPhoto = { id: string; serviceId: string | null; isHidden: boolean }

test.describe('«Образы» feed', () => {
  test('a tagged work photo books that service with that master; reports hide it', async ({
    page,
    browser,
    isMobile,
  }, testInfo) => {
    test.skip(isMobile, 'Runs once: it adds a photo to the business')
    test.setTimeout(90_000)
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    const manage = `/api/manage/${SLUG}`
    const business = await (await page.request.get(`/api/businesses/${SLUG}`)).json()
    const master = business.catalog.specialists[0]
    const service = business.catalog.services.find(
      (item: { id: string }) => item.id === master.serviceIds[0],
    )
    const before: WorkPhoto[] = await (await page.request.get(`${manage}/work-photos`)).json()
    let photoId: string | null = null

    try {
      // The owner adds a photo; the sheet opens at once to say what is on it.
      // The strip loads its photos once hydrated; picking a file earlier would be lost.
      await Promise.all([
        page.waitForResponse((response) => response.url().includes('/work-photos')),
        page.goto(`/manage/${SLUG}?tab=profile`),
      ])
      await page.getByLabel('Файл фото').setInputFiles({
        name: 'work.png',
        mimeType: 'image/png',
        buffer: Buffer.from(TINY_PNG, 'base64'),
      })
      const sheet = page.getByRole('dialog', { name: 'Фото работы' })
      await expect(sheet).toBeVisible()
      await sheet.getByRole('combobox', { name: 'Услуга на фото' }).click()
      await page.getByRole('option', { name: service.name, exact: true }).click()
      await sheet.getByRole('combobox', { name: 'Мастер на фото' }).click()
      await page.getByRole('option', { name: master.name, exact: true }).click()
      await sheet.getByRole('button', { name: 'Готово' }).click()
      await expect(sheet).toBeHidden()

      const after: WorkPhoto[] = await (await page.request.get(`${manage}/work-photos`)).json()
      const added = after.find((photo) => !before.some((known) => known.id === photo.id))
      expect(added).toMatchObject({ serviceId: service.id, isHidden: false })
      photoId = added?.id ?? null

      // A guest opens the feed on it: the service, its price and «Записаться» on it.
      const guest = await browser.newPage()
      await guest.goto(`/feed?start=${photoId}`)
      const card = guest.getByRole('article').first()
      await expect(card.getByRole('heading', { name: service.name })).toBeVisible()
      // The master is the card's author: their face books them.
      await expect(
        card.getByRole('link', { name: `Записаться к мастеру ${master.name}` }),
      ).toHaveAttribute('href', `/${SLUG}/book?specialist=${master.id}`)

      // «Нравится» (under the hand) counts once per device and goes back; a double tap on the
      // photo likes it.
      const like = guest.getByRole('button', { name: /^Нравится/ })
      await like.click()
      await expect(like).toHaveAttribute('aria-pressed', 'true')
      await expect(like).toHaveAccessibleName('Нравится: 1')
      await like.click()
      await expect(like).toHaveAttribute('aria-pressed', 'false')
      const photo = card.getByRole('img', { name: `Работа: ${service.name}` })
      await photo.dblclick()
      await expect(like).toHaveAttribute('aria-pressed', 'true')
      await expect
        .poll(async () => {
          const feed = await (await guest.request.get(`/api/feed?start=${photoId}`)).json()
          return feed.items.find((item: { id: string }) => item.id === photoId)?.likes
        })
        .toBeGreaterThanOrEqual(0)

      // Reviews of this service with this master open over the feed.
      await guest.getByRole('button', { name: 'Ещё' }).click()
      await guest.getByRole('menuitem', { name: /^Отзывы/ }).click()
      const reviews = guest.getByRole('dialog', { name: /^Отзывы/ })
      await expect(reviews).toBeVisible()
      await reviews.getByRole('button', { name: 'Готово' }).click()
      await expect(reviews).toBeHidden()

      const book = guest.getByRole('link', { name: /^Записаться( ·|$)/ })
      await expect(book).toHaveAttribute(
        'href',
        new RegExp(`^/${SLUG}/book\\?service=${service.id}&specialist=${master.id}`),
      )
      await book.click()
      await expect(guest).toHaveURL(new RegExp(`/${SLUG}/book\\?service=${service.id}`))
      await guest.close()

      // Three reports take it out of the feed until the owner looks.
      for (let report = 0; report < 3; report += 1) {
        expect((await page.request.post(`/api/feed/${photoId}/report`)).status()).toBe(204)
      }
      const feed = await (await page.request.get(`/api/feed?business=${SLUG}`)).json()
      expect(feed.items.some((item: { id: string }) => item.id === photoId)).toBe(false)
      const hidden: WorkPhoto[] = await (await page.request.get(`${manage}/work-photos`)).json()
      expect(hidden.find((photo) => photo.id === photoId)).toMatchObject({ isHidden: true })
    } finally {
      if (photoId) await page.request.delete(`${manage}/work-photos/${photoId}`)
    }
  })

  test('the feed opens with categories and an empty state for a quiet kind', async ({ page }) => {
    await page.goto('/feed?kind=health')
    await expect(page.getByRole('navigation', { name: 'Категории работ' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Здоровье' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expect(page.getByRole('feed', { name: 'Образы' })).toBeVisible()
  })
})
