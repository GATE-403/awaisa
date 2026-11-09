import { expect, test } from '@playwright/test'

test.describe('Map: places nearby', () => {
  test('lists places with a pin and books at the chosen branch', async ({ page }) => {
    await page.goto('/map')
    const studio = page.getByRole('listitem').filter({ hasText: 'Awaisa Studio' })
    await expect(studio).toBeVisible()
    await expect(page.getByRole('region', { name: 'Карта салонов и мастеров' })).toBeVisible()

    await studio.getByRole('link', { name: 'Записаться' }).click()
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
})
