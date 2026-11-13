import { expect, test } from '@playwright/test'
import { adminPhone, formatPhone, randomClientPhone, signInViaApi, TEST_CODE } from './account'
import {
  bookingSteps,
  cancelViaApi,
  pickFirstFreeSlot,
  readStoredBookings,
  submitBooking,
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
    await expect(page.getByRole('region', { name: 'Профиль' })).toContainText(formatPhone(phone))
  })

  test('the profile takes a photo: it shows in place of the initials and can be removed', async ({
    page,
  }) => {
    await signInViaApi(page, randomClientPhone(), 'E2E Фото')
    await page.goto('/bookings')
    const profile = page.getByRole('region', { name: 'Профиль' })
    await expect(profile.getByRole('heading', { name: 'E2E Фото' })).toBeVisible()
    await profile.getByLabel('Файл фото профиля').setInputFiles({
      name: 'me.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAABAAAAAKCAIAAAAy3EnLAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAFUlEQVQYlWNgKHxMGmIY1fB4KIYSAN5g1IFgp8jzAAAAAElFTkSuQmCC',
        'base64',
      ),
    })
    await expect(profile.getByRole('img', { name: 'E2E Фото' })).toBeVisible()
    const me = await (await page.request.get('/api/me')).json()
    expect(me.avatarUrl).toMatch(/^\/api\/media\/customers\/.+\.webp$/)

    await profile.getByRole('button', { name: 'Фото профиля' }).click()
    await page.getByRole('menuitem', { name: 'Удалить фото' }).click()
    await expect(profile.getByRole('img', { name: 'E2E Фото' })).toHaveCount(0)
    expect((await (await page.request.get('/api/me')).json()).avatarUrl).toBeNull()
  })

  test('a wrong code explains how many attempts are left', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Номер телефона').fill(randomClientPhone())
    await page.getByRole('button', { name: 'Получить код' }).click()
    await page.getByLabel('Код подтверждения').fill('000000')

    await expect(page.getByText('Неверный код, осталось попыток: 4')).toBeVisible()
    await expect(page.getByRole('button', { name: /Отправить снова через \d+ с/ })).toBeDisabled()
  })

  test('profile and bookings are one page: guests see their device bookings and a sign-in card', async ({
    page,
  }) => {
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/bookings$/)
    await page.getByRole('region', { name: 'Профиль' }).getByRole('link', { name: 'Войти' }).click()
    await expect(page).toHaveURL(/\/login\?next=(%2F|\/)bookings/)
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
    await submitBooking(page)
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
    // Tomorrow: the strip also holds past days, which can't be closed.
    await page.getByRole('group', { name: 'День' }).locator('[data-today] + button').click()

    // The phone and desktop runs close time for the same master and day at once: each finds its
    // own block by its own reason.
    const reason = `E2E перерыв ${testInfo.project.name}`
    await page.getByRole('button', { name: 'Закрыть время' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Причина').fill(reason)
    await dialog.getByRole('button', { name: 'Готово' }).click()
    const block = page.getByText(reason, { exact: true }).locator('..')
    await expect(block).toBeVisible()

    // A real visit may sit at the same time and cover the block: press its button directly.
    await block.getByRole('button', { name: /^Открыть время/ }).dispatchEvent('click')
    await expect(page.getByText(reason, { exact: true })).toHaveCount(0)
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
    await submitBooking(clientPage)
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
