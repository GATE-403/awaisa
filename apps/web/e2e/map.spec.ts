import { expect, test } from '@playwright/test'

test.describe('Map: places nearby', () => {
  test('lists places with a pin and books at the chosen branch', async ({ page }) => {
    await page.goto('/map')
    const studio = page.getByRole('listitem').filter({ hasText: 'Awaisa Studio' })
    await expect(studio).toBeVisible()
    await expect(page.getByRole('region', { name: 'Карта салонов и мастеров' })).toBeVisible()

    // The whole row books at that branch.
    await studio.getByRole('link', { name: /Awaisa Studio/ }).click()
    await expect(page).toHaveURL(/\/awaisa-studio\/book\?branch=/)
  })

  test('sorts by distance once the location is shared', async ({ page, context }) => {
    await context.grantPermissions(['geolocation'])
    await context.setGeolocation({ latitude: 42.87, longitude: 74.6 })
    await page.goto('/map')
    await page.getByRole('button', { name: 'Рядом со мной' }).click()
    await expect(page.getByText(/ближайшие сверху/)).toBeVisible()
    await expect(
      page
        .getByRole('listitem')
        .filter({ hasText: 'Awaisa Studio' })
        .getByText(/\d+(,\d)? (км|м)$/),
    ).toBeVisible()
  })

  test('kind tabs filter the places', async ({ page }) => {
    await page.goto('/map?kind=barber')
    await expect(page.getByRole('listitem').filter({ hasText: 'Awaisa Studio' })).toHaveCount(0)
  })

  test('on phones the list sheet changes height by its grabber', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Desktop has a floating sidebar instead')
    await page.goto('/map')
    const map = page.getByRole('region', { name: 'Карта салонов и мастеров' })
    await expect(map).toBeVisible()
    const half = (await map.boundingBox())?.height ?? 0
    // A tap steps through the heights: half → full screen → compact.
    await page.getByRole('button', { name: /Список наполовину/ }).click()
    await expect(page.getByRole('button', { name: /Список на весь экран/ })).toBeVisible()
    await expect.poll(async () => (await map.boundingBox())?.height ?? 0).toBeLessThan(10)
    // Dragging down settles on the nearest height: the list folds and the map grows.
    const grabber = page.getByRole('button', { name: /Список на весь экран/ })
    const box = await grabber.boundingBox()
    if (!box) throw new Error('no grabber')
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2, box.y + 500, { steps: 12 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: /Список свёрнут/ })).toBeVisible()
    await expect.poll(async () => (await map.boundingBox())?.height ?? 0).toBeGreaterThan(half)
  })
})
