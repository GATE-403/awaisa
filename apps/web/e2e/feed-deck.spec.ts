import { expect, type Page, test } from '@playwright/test'

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

test.describe('«Образы»: the deck', () => {
  test('a swipe either way deals the next card, a pull up brings the last one back', async ({
    page,
  }) => {
    await openDeck(page)
    const first = await activeCard(page).getAttribute('aria-label')
    await expect(page.getByText('Потяните вверх — вернуть прошлую')).toHaveCount(0)

    // A short, slow move is not a swipe: the card settles back.
    await drag(page, -12, 0, 12)
    await expectPosition(page, 1)

    await drag(page, -140, 0)
    await expectPosition(page, 2)
    expect(await activeCard(page).getAttribute('aria-label')).not.toBe(first)
    // Once a card has gone the hint says how to get it back.
    await expect(page.getByText('Потяните вверх — вернуть прошлую')).toBeVisible()

    await drag(page, 140, 0)
    await expectPosition(page, 3)

    await drag(page, 0, -160)
    await expectPosition(page, 2)
    await drag(page, 0, -160)
    await expectPosition(page, 1)
    await expect(activeCard(page)).toHaveAttribute('aria-label', first ?? '')

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

    const reported = await activeCard(page).getAttribute('aria-label')
    await page.getByRole('button', { name: 'Ещё' }).click()
    // A report asks why: «Пожаловаться» opens the reasons.
    await page.getByRole('menuitem', { name: 'Пожаловаться' }).click()
    await page.getByRole('menuitem', { name: 'Спам или реклама' }).click()
    await expect(page.getByText('Спасибо, жалобу проверит модератор')).toBeVisible()
    expect(reports).toHaveLength(1)
    expect(reports[0]).toMatchObject({ targetType: 'photo', targetId: second, reason: 'spam' })
    // The next card takes its place at once.
    await expectPosition(page, 2)
    await expect(activeCard(page)).not.toHaveAttribute('aria-label', reported ?? '')
  })
})
