import { expect, type Page, test } from '@playwright/test'
import { adminPhone, signInViaApi } from './account'

// The card in play carries `data-active`; its place in the deck is `aria-posinset` (1-based).
const activeCard = (page: Page) => page.locator('article[data-active]')

const expectPosition = (page: Page, position: number) =>
  expect(activeCard(page)).toHaveAttribute('aria-posinset', String(position))

// A finger (or a mouse) on the photo of the card in play, moved by dx/dy in steps, then let go.
// Cards glide into place after each turn: a drag starts once every card in the deck rests, as a
// person's next swipe would (one begun mid-glide was lost on phones).
const restingBox = async (page: Page) => {
  await page.evaluate(() =>
    Promise.all(
      [...document.querySelectorAll('[role="feed"] article')].flatMap((card) =>
        card.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
      ),
    ),
  )
  const box = await activeCard(page)
    .getByRole('img', { name: /^Работа/ })
    .boundingBox()
  if (!box) throw new Error('No card in play')
  return box
}

const drag = async (page: Page, dx: number, dy: number, steps = 8) => {
  const box = await restingBox(page)
  const x = box.x + box.width / 2
  const y = box.y + box.height * 0.4
  await page.mouse.move(x, y)
  await page.mouse.down()
  for (let step = 1; step <= steps; step += 1) {
    await page.mouse.move(x + (dx * step) / steps, y + (dy * step) / steps)
    await page.waitForTimeout(16)
  }
  await page.mouse.up()
}

const openDeck = async (page: Page) => {
  await page.goto('/feed')
  await expect(page.getByRole('feed', { name: 'Образы' })).toBeVisible()
  await expectPosition(page, 1)
}

const SLUG = 'awaisa-studio'

// 16×10 px PNG; the API re-encodes it as WebP.
const TINY_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAKCAIAAAAy3EnLAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAFUlEQVQYlWNgKHxMGmIY1fB4KIYSAN5g1IFgp8jzAAAAAElFTkSuQmCC'

type WorkPhoto = { id: string; serviceId: string | null; isHidden: boolean }

test.describe('«Образы»: the deck', () => {
  test('a swipe either way deals the next card, a pull up brings the last one back', async ({
    page,
  }) => {
    await openDeck(page)
    // The photo tells cards apart: one place may have several works in a row.
    const photoOf = () => activeCard(page).locator('img').first().getAttribute('src')
    const first = await photoOf()
    await expect(page.getByText('Потяните вверх — вернуть прошлую')).toHaveCount(0)

    // A short, slow move is not a swipe: the card settles back.
    await drag(page, -12, 0, 12)
    await expectPosition(page, 1)

    await drag(page, -140, 0)
    await expectPosition(page, 2)
    expect(await photoOf()).not.toBe(first)
    // Once a card has gone the hint says how to get it back.
    await expect(page.getByText('Потяните вверх — вернуть прошлую')).toBeVisible()

    await drag(page, 140, 0)
    await expectPosition(page, 3)

    await drag(page, 0, -160)
    await expectPosition(page, 2)
    await drag(page, 0, -160)
    await expectPosition(page, 1)
    expect(await photoOf()).toBe(first)

    // Nothing to bring back before the first card.
    await drag(page, 0, -160)
    await expectPosition(page, 1)
  })

  test('keys and the side buttons turn it', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Keys and the ‹ › buttons are for a mouse and keyboard')
    await openDeck(page)
    const previous = page.getByRole('button', { name: 'Предыдущая работа' })
    const next = page.getByRole('button', { name: 'Следующая работа' })
    await expect(previous).toBeDisabled()

    await page.keyboard.press('ArrowRight')
    await expectPosition(page, 2)
    await page.keyboard.press('j')
    await expectPosition(page, 3)
    await page.keyboard.press('PageDown')
    await expectPosition(page, 4)
    await page.keyboard.press('k')
    await expectPosition(page, 3)
    await page.keyboard.press('ArrowUp')
    await expectPosition(page, 2)

    await next.click()
    await expectPosition(page, 3)
    await previous.click()
    await previous.click()
    await expectPosition(page, 1)
    await expect(previous).toBeDisabled()
  })

  test('the next page loads before the deck runs out', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Turned with keys: the same loading on every screen')
    await openDeck(page)
    const nextPage = page.waitForResponse(
      (response) => response.url().includes('/api/feed') && /[?&]offset=\d+/.test(response.url()),
    )
    // A page holds 12 cards; the next one is asked for three before the end.
    for (let turn = 0; turn < 10; turn += 1) await page.keyboard.press('ArrowRight')
    await expectPosition(page, 11)
    await nextPage
    // Past the first page's last card: the cards of the next page are in the deck.
    for (const position of [12, 13, 14]) {
      await page.keyboard.press('ArrowRight')
      await expectPosition(page, position)
    }
  })

  test('«⋯» shares the work in play and a report takes it out of the deck', async ({ page }) => {
    // The system share sheet is replaced by a recorder; the report never reaches the shared data.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: (data: ShareData) => {
          ;(window as unknown as { shared?: ShareData }).shared = data
          return Promise.resolve()
        },
      })
    })
    const reports: { targetType?: string; targetId?: string; reason?: string }[] = []
    await page.route('**/api/reports', async (route) => {
      reports.push(route.request().postDataJSON())
      await route.fulfill({ status: 204 })
    })

    await openDeck(page)
    await drag(page, -140, 0)
    await expectPosition(page, 2)

    const feed = await (await page.request.get('/api/feed')).json()
    const second = feed.items[1]?.id as string

    await page.getByRole('button', { name: 'Ещё' }).click()
    await page.getByRole('menuitem', { name: 'Поделиться' }).click()
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { shared?: ShareData }).shared?.url))
      .toMatch(new RegExp(`/feed\\?start=${second}$`))

    const photo = activeCard(page).locator('img').first()
    const reported = await photo.getAttribute('src')
    await page.getByRole('button', { name: 'Ещё' }).click()
    // A report asks why: «Пожаловаться» opens the reasons.
    await page.getByRole('menuitem', { name: 'Пожаловаться' }).click()
    await page.getByRole('menuitem', { name: 'Спам или реклама' }).click()
    await expect(page.getByText('Спасибо, жалобу проверит модератор')).toBeVisible()
    expect(reports).toHaveLength(1)
    expect(reports[0]).toMatchObject({ targetType: 'photo', targetId: second, reason: 'spam' })
    // The next card takes its place at once.
    await expectPosition(page, 2)
    await expect(activeCard(page).locator('img').first()).not.toHaveAttribute('src', reported ?? '')
  })
})

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
        page.goto(`/manage/${SLUG}?tab=page`),
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

      // Three reports from different devices take it out of the feed until someone looks.
      const viewers = await browser.newContext()
      for (let report = 0; report < 3; report += 1) {
        const response = await viewers.request.post(`/api/feed/${photoId}/report`, {
          data: { reason: 'spam', session: `e2e-feed-${photoId}-${report}` },
        })
        expect(response.status()).toBe(204)
      }
      await viewers.close()
      const feed = await (await page.request.get(`/api/feed?business=${SLUG}`)).json()
      expect(feed.items.some((item: { id: string }) => item.id === photoId)).toBe(false)
      const hidden: WorkPhoto[] = await (await page.request.get(`${manage}/work-photos`)).json()
      expect(hidden.find((photo) => photo.id === photoId)).toMatchObject({ isHidden: true })
    } finally {
      if (photoId) await page.request.delete(`${manage}/work-photos/${photoId}`)
    }
  })

  test('the feed is a deck with no filters over it, a kind link still narrows it', async ({
    page,
  }) => {
    await page.goto('/feed?kind=health')
    await expect(page.getByRole('feed', { name: 'Образы' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Категории работ' })).toHaveCount(0)
  })
})
