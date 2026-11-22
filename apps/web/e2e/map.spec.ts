import { expect, type Page, test } from '@playwright/test'
import { settledBox } from './helpers'

// The page streams in over a pending copy of itself (the Suspense fallback is the same MapPage):
// until React swaps them, the DOM holds two «Где вы?» and the fallback's controls do nothing.
// A visible place row exists only once the real page is in.
const openMap = async (page: Page, path = '/map') => {
  await page.goto(path)
  await expect(
    page
      .getByRole('listitem')
      .filter({ has: page.getByRole('link') })
      .first(),
  ).toBeVisible()
}

test.describe('Map: places nearby', () => {
  test('lists places with a pin and books at the chosen branch', async ({ page }) => {
    await openMap(page)
    // A place with several branches has a row each: take the first.
    const studio = page.getByRole('listitem').filter({ hasText: 'Awaisa Studio' }).first()
    await expect(studio).toBeVisible()
    await expect(page.getByRole('region', { name: 'Карта салонов и мастеров' })).toBeVisible()

    // The whole row books at that branch.
    await studio.getByRole('link', { name: /Awaisa Studio/ }).click()
    await expect(page).toHaveURL(/\/awaisa-studio\/book\?branch=/)
  })

  test('sorts by distance once the location is shared', async ({ page, context }) => {
    await context.grantPermissions(['geolocation'])
    await context.setGeolocation({ latitude: 42.87, longitude: 74.6 })
    await openMap(page)
    await page.getByRole('button', { name: 'Где вы?' }).click()
    await page
      .getByRole('dialog', { name: 'Где вы?' })
      .getByRole('button', { name: 'Определить автоматически' })
      .click()
    await expect(page.getByText(/ближайшие сверху/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Моё место' })).toBeVisible()
    await expect(
      page
        .getByRole('listitem')
        .filter({ hasText: 'Awaisa Studio' })
        .getByText(/\d+(,\d)? (км|м)$/)
        .first(),
    ).toBeVisible()
  })

  test('without geolocation a district stands in for the location and is remembered', async ({
    page,
  }) => {
    await openMap(page)
    await expect(page.getByText(/Укажите, где вы/)).toBeVisible()
    await page.getByRole('button', { name: 'Где вы?' }).click()
    await page
      .getByRole('dialog', { name: 'Где вы?' })
      .getByRole('button', { name: 'Асанбай' })
      .click()
    await expect(page.getByText(/ближайшие сверху/)).toBeVisible()
    await page.reload()
    await expect(page.getByRole('button', { name: 'Асанбай' })).toBeVisible()
    await expect(page.getByText(/ближайшие сверху/)).toBeVisible()
  })

  test('kind tabs filter the places', async ({ page }) => {
    await openMap(page, '/map?kind=barber')
    await expect(page.getByRole('listitem').filter({ hasText: 'Awaisa Studio' })).toHaveCount(0)
  })

  test('on phones pulling the list down from its top collapses the sheet', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'The sheet is a phone layout')
    await openMap(page)
    await expect(page.getByRole('button', { name: /Список наполовину/ })).toBeVisible()
    const row = page.getByRole('listitem').first()
    const box = await row.boundingBox()
    if (!box) throw new Error('no row')
    // A real finger: touch events through CDP, the list already at its top.
    const cdp = await page.context().newCDPSession(page)
    const x = box.x + box.width / 2
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', y: number) =>
      cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
      })
    await touch('touchStart', box.y + 10)
    for (let step = 1; step <= 12; step += 1) await touch('touchMove', box.y + 10 + step * 25)
    await touch('touchEnd', box.y + 310)
    await expect(page.getByRole('button', { name: /Список свёрнут/ })).toBeVisible()
  })

  test('on phones the list sheet changes height by its grabber; «Карта» brings the map back', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'Desktop has a floating sidebar instead')
    await openMap(page)
    const map = page.getByRole('region', { name: 'Карта салонов и мастеров' })
    await expect(map).toBeVisible()
    const half = (await map.boundingBox())?.height ?? 0
    const back = page.getByRole('button', { name: 'Карта', exact: true })
    await expect(back).toHaveCount(0)
    // A tap steps through the heights: half → full screen → compact.
    await page.getByRole('button', { name: /Список наполовину/ }).click()
    await expect(page.getByRole('button', { name: /Список на весь экран/ })).toBeVisible()
    await expect.poll(async () => (await map.boundingBox())?.height ?? 0).toBeLessThan(10)
    // The full-screen list has a «Карта» button: one tap brings the map back.
    await back.click()
    await expect(page.getByRole('button', { name: /Список наполовину/ })).toBeVisible()
    await expect(back).toHaveCount(0)
    await page.getByRole('button', { name: /Список наполовину/ }).click()
    // Dragging down settles on the nearest height: the list folds and the map grows.
    const grabber = page.getByRole('button', { name: /Список на весь экран/ })
    const box = await settledBox(grabber)
    if (!box) throw new Error('no grabber')
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2, box.y + 500, { steps: 12 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: /Список свёрнут/ })).toBeVisible()
    await expect.poll(async () => (await map.boundingBox())?.height ?? 0).toBeGreaterThan(half)
  })
})
