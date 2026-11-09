import { expect, test } from '@playwright/test'
import { adminPhone, formatPhone, randomClientPhone, signInViaApi, TEST_CODE } from './account'
import {
  bookingSteps,
  cancelViaApi,
  pickFirstFreeSlot,
  primaryAction,
  readStoredBookings,
} from './helpers'

test.describe('Account: sign in by SMS', () => {
  test.afterEach(async ({ page }) => {
    const stored = await readStoredBookings(page).catch(() => [])
    await Promise.all(stored.map(cancelViaApi))
  })

  test('new client signs in with a code, names themselves and lands where they started', async ({
    page,
  }) => {
    const phone = randomClientPhone()
    await page.goto('/login?next=/bookings')

    await page.getByLabel('Номер телефона').fill(phone)
    await page.getByRole('button', { name: 'Получить код' }).click()
    await expect(page.getByText(`Код отправлен по SMS на ${formatPhone(phone)}`)).toBeVisible()

    const code = page.getByLabel('Код подтверждения')
    await expect(code).toHaveAttribute('autocomplete', 'one-time-code')
    await code.fill(TEST_CODE)

    await page.getByLabel('Имя').fill('E2E Тест')
    await page.getByRole('button', { name: 'Готово' }).click()

    await expect(page).toHaveURL(/\/bookings$/)
    await expect(page.getByText(`Записи на номер ${formatPhone(phone)}`)).toBeVisible()
  })

  test('a wrong code explains how many attempts are left', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Номер телефона').fill(randomClientPhone())
    await page.getByRole('button', { name: 'Получить код' }).click()
    await page.getByLabel('Код подтверждения').fill('000000')

    await expect(page.getByText('Неверный код, осталось попыток: 4')).toBeVisible()
    await expect(page.getByRole('button', { name: /Отправить снова через \d+ с/ })).toBeDisabled()
  })

  test('profile is private: guests are sent to sign in', async ({ page }) => {
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/login\?next=%2Fprofile/)
  })

  test('signed-in client books without typing a phone and sees it on any device', async ({
    page,
    browser,
  }) => {
    const phone = randomClientPhone()
    await signInViaApi(page, phone)
    await page.goto('/awaisa-studio/book?service=styling')
    const steps = bookingSteps(page)

    await steps.specialist.getByRole('radio', { name: /Любой мастер/ }).click()
    const time = await pickFirstFreeSlot(page)
    await expect(steps.contacts.getByLabel('Имя')).toHaveValue('E2E Тест')
    await expect(steps.contacts.getByLabel('Телефон')).toHaveCount(0)
    await expect(steps.contacts).toContainText(formatPhone(phone))
    await primaryAction(page).click()
    await expect(page.getByRole('heading', { name: 'Вы записаны' })).toBeVisible()

    // Same session cookie, empty localStorage: the list must come from the account, not the device.
    const otherDevice = await browser.newContext({
      storageState: { cookies: await page.context().cookies(), origins: [] },
    })
    const otherPage = await otherDevice.newPage()
    await otherPage.goto('/bookings')
    await expect(otherPage.getByRole('article', { name: /^Запись / })).toContainText(time)
    await otherDevice.close()
  })
})

test.describe('Salon admin', () => {
  test('non-staff accounts cannot open the schedule', async ({ page }) => {
    await signInViaApi(page, randomClientPhone())
    await page.goto('/manage/awaisa-studio')
    await expect(page.getByRole('heading', { name: /Нет доступа/ })).toBeVisible()
  })

  test('staff see the day by master, close time and open it again', async ({ page }, testInfo) => {
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    await page.goto('/manage/awaisa-studio')

    await expect(page.getByRole('region', { name: 'Айгерим Садыкова' })).toBeVisible()
    await page.getByRole('group', { name: 'День' }).getByRole('button').nth(1).click()

    await page.getByRole('button', { name: 'Закрыть время' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Причина').fill('E2E перерыв')
    await dialog.getByRole('button', { name: 'Готово' }).click()
    await expect(page.getByText('E2E перерыв')).toBeVisible()

    await page
      .getByRole('button', { name: /^Открыть время 13:00–14:00/ })
      .first()
      .click()
    await expect(page.getByText('E2E перерыв')).toHaveCount(0)
  })

  test('staff cancel a client booking and the client sees it cancelled', async ({
    page,
    browser,
  }, testInfo) => {
    const client = await browser.newContext()
    const clientPage = await client.newPage()
    const clientPhone = randomClientPhone()
    await signInViaApi(clientPage, clientPhone, 'E2E Клиент')
    await clientPage.goto('/awaisa-studio/book?service=styling')
    await bookingSteps(clientPage)
      .specialist.getByRole('radio', { name: /Любой мастер/ })
      .click()
    await pickFirstFreeSlot(clientPage)
    await primaryAction(clientPage).click()
    await expect(clientPage.getByRole('heading', { name: 'Вы записаны' })).toBeVisible()
    const booked = (await clientPage.request
      .get('/api/me/bookings')
      .then((response) => response.json())) as {
      date: string
    }[]

    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    await page.goto('/manage/awaisa-studio')
    const dayButtons = page.getByRole('group', { name: 'День' }).getByRole('button')
    await dayButtons.first().waitFor()
    const dayIndex = await dayButtons.evaluateAll(
      (buttons, date) => buttons.findIndex((button) => button.getAttribute('data-day') === date),
      booked[0]?.date ?? '',
    )
    if (dayIndex > 0) await dayButtons.nth(dayIndex).click()

    const phonePattern = clientPhone.replace('+', '\\+')
    await page.getByRole('button', { name: new RegExp(phonePattern) }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Отменить запись' }).click()
    await expect(
      page.getByRole('button', { name: new RegExp(`${phonePattern}, отменена`) }),
    ).toBeVisible()

    await clientPage.goto('/bookings')
    await expect(clientPage.getByRole('article', { name: /^Запись / }).first()).toContainText(
      'Отменена',
    )
    await client.close()
  })
})
