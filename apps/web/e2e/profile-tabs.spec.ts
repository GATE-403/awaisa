import { expect, test } from '@playwright/test'
import { randomClientPhone, signInViaApi, TEST_CODE } from './account'

test.describe('Sign-in and the profile’s tabs', () => {
  test('signing in greets the person by name before taking them on', async ({ page }) => {
    await page.goto('/login?next=/bookings')
    await page.getByLabel('Номер телефона').fill(randomClientPhone())
    await page.getByRole('button', { name: 'Получить код' }).click()
    await page.getByLabel('Код подтверждения').fill(TEST_CODE)
    await page.getByLabel('Имя').fill('Айпери Тест')
    await page.getByRole('button', { name: 'Готово' }).click()

    // The greeting is spoken (an `output`) and uses the first name only.
    const greeting = page.getByRole('status')
    await expect(greeting).toContainText('Привет, Айпери')
    await expect(greeting).toContainText('Вы вошли')
    await expect(page).toHaveURL(/\/bookings$/)
  })

  test('the open tab lives in the address; «Выйти» signs out at once and leads to the catalog', async ({
    page,
  }) => {
    await signInViaApi(page, randomClientPhone(), 'E2E Тест')
    await page.goto('/bookings?tab=settings')
    const tabs = page.getByRole('tablist', { name: 'Профиль' })
    await expect(tabs.getByRole('tab', { name: /^Настройки/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await tabs.getByRole('tab', { name: /^История/ }).click()
    await expect(page).toHaveURL(/[?&]tab=history/)
    await page.reload()
    await expect(tabs.getByRole('tab', { name: /^История/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await tabs.getByRole('tab', { name: /^Избранное/ }).click()
    await expect(page).toHaveURL(/[?&]tab=favorites/)
    await expect(tabs.getByRole('tab', { name: /^Избранное/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await tabs.getByRole('tab', { name: /^Настройки/ }).click()
    await page.getByRole('button', { name: 'Выйти' }).click()
    // Signed out at once, on the catalog; the session is gone on the server too.
    await expect(page).toHaveURL((url) => url.pathname === '/')
    expect((await page.request.get('/api/me')).status()).toBe(401)
    // The profile is a guest's again: a sign-in card, no settings.
    await page.goto('/bookings')
    await expect(
      page.getByRole('region', { name: 'Профиль' }).getByRole('link', { name: 'Войти' }),
    ).toBeVisible()
    await expect(tabs.getByRole('tab', { name: /^Настройки/ })).toHaveCount(0)
  })
})
