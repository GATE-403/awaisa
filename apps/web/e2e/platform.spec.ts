import { expect, test } from '@playwright/test'
import { randomClientPhone, signInViaApi } from './account'
import { bookingSteps, pickFirstFreeSlot, primaryAction } from './helpers'

test.describe('Platform: a new business goes live', () => {
  test('owner registers, adds a service and a master; a client books; owner sees it', async ({
    page,
    browser,
  }) => {
    const suffix = Math.random().toString(36).slice(2, 7)
    const name = `E2E Барбер ${suffix}`
    const slug = `e2e-barber-${suffix}`
    await signInViaApi(page, randomClientPhone(), 'E2E Владелец')

    await page.goto('/business')
    await page.getByRole('link', { name: 'Создать страницу' }).click()
    await page.getByLabel('Название').fill(name)
    await expect(page.getByLabel('Адрес страницы')).toHaveValue(slug)
    await expect(page.getByText(`Свободен: awaisa.kg/${slug}`)).toBeVisible()
    await page.getByRole('button', { name: 'Далее' }).click()

    // Kind: a barbershop gets a starter menu; this test builds its own, so it picks «Другое».
    await page.getByRole('radio', { name: 'Барбершопы' }).click()
    await expect(page.getByRole('checkbox', { name: 'Мужская стрижка' })).toBeChecked()
    await page.getByRole('radio', { name: 'Другое' }).click()
    await expect(page.getByRole('checkbox')).toHaveCount(0)
    await page.getByRole('button', { name: 'Далее' }).click()
    await page.getByRole('button', { name: 'Создать страницу' }).click()

    await expect(page).toHaveURL(new RegExp(`/manage/${slug}\\?tab=services`))
    await expect(page.getByRole('heading', { name: 'Запуск записи' })).toBeVisible()

    await page.getByRole('button', { name: 'Добавить услугу' }).first().click()
    const serviceDialog = page.getByRole('dialog')
    await serviceDialog.getByLabel('Название').fill('Стрижка')
    await serviceDialog.getByLabel('Цена, сом').fill('700')
    await serviceDialog.getByRole('button', { name: 'Сохранить' }).click()
    await expect(page.getByRole('button', { name: /Стрижка/ })).toBeVisible()

    await page.getByRole('link', { name: 'Мастера' }).click()
    await page.getByRole('button', { name: 'Добавить мастера' }).first().click()
    const masterDialog = page.getByRole('dialog')
    await masterDialog.getByLabel('Имя').fill('Азамат')
    await expect(masterDialog.getByRole('checkbox', { name: 'Стрижка' })).toBeChecked()
    await masterDialog.getByRole('button', { name: 'Сохранить' }).click()
    await expect(page.getByRole('heading', { name: 'Запуск записи' })).toHaveCount(0)

    const client = await browser.newContext()
    const clientPage = await client.newPage()
    await clientPage.goto('/')
    await clientPage.getByRole('button', { name: 'Поиск' }).click()
    const search = clientPage.getByRole('searchbox', { name: 'Поиск салонов и мастеров' })
    await search.fill(name)
    await search.press('Enter')
    await clientPage.getByRole('link', { name: new RegExp(name) }).click()
    await expect(clientPage).toHaveURL(new RegExp(`/${slug}$`))
    await clientPage.getByRole('link', { name: 'Записаться' }).first().click()

    const steps = bookingSteps(clientPage)
    await steps.service.getByRole('radio', { name: /Стрижка/ }).click()
    // The only master is chosen for the client: the step is already filled in.
    await expect(steps.specialist).toContainText('Азамат')
    const time = await pickFirstFreeSlot(clientPage)
    const clientPhone = randomClientPhone()
    await steps.contacts.getByLabel('Имя').fill('E2E Клиент')
    await steps.contacts.getByLabel('Телефон').fill(clientPhone)
    await primaryAction(clientPage).click()
    await expect(clientPage.getByRole('heading', { name: 'Вы записаны' })).toBeVisible()
    await expect(clientPage.getByRole('article', { name: /^Запись / })).toContainText(name)
    const booked = await clientPage.evaluate(() => {
      const raw = window.localStorage.getItem('awaisa:bookings:v2')
      return raw ? (JSON.parse(raw) as { snapshot: { date: string } }[])[0]?.snapshot.date : null
    })
    await client.close()

    await page.getByRole('link', { name: 'Расписание' }).click()
    const day = page.locator(`[data-day="${booked}"]`)
    await day.waitFor()
    await day.click()
    const phonePattern = clientPhone.replace('+', '\\+')
    await expect(
      page.getByRole('button', { name: new RegExp(`^${time}.*${phonePattern}`) }),
    ).toBeVisible()

    // A walk-in: the owner taps an empty slot and books the client in.
    await page
      .getByRole('button', { name: 'Новая запись к мастеру Азамат' })
      .click({ position: { x: 24, y: 320 } })
    const sheet = page.getByRole('dialog', { name: 'Новая запись' })
    await expect(sheet.getByRole('combobox', { name: 'Время' })).toBeVisible()
    await sheet.getByLabel('Имя').fill('E2E Гость')
    await sheet.getByLabel('Телефон').fill(randomClientPhone())
    await sheet.getByRole('button', { name: 'Добавить' }).click()
    await expect(sheet).toHaveCount(0)
    await expect(page.getByRole('button', { name: /E2E Гость/ })).toBeVisible()
  })

  test('reserved and taken page addresses are refused before submitting', async ({ page }) => {
    await signInViaApi(page, randomClientPhone(), 'E2E Владелец')
    await page.goto('/business/new')

    await page.getByLabel('Название').fill('Login')
    await expect(page.getByText('Этот адрес занят')).toBeVisible()
    await page.getByLabel('Адрес страницы').fill('awaisa-studio')
    await expect(page.getByText('Этот адрес занят')).toBeVisible()
  })

  test('closed days cannot be picked for booking', async ({ page }) => {
    await page.goto('/awaisa-studio/book')
    const closedDays = page
      .getByRole('group', { name: 'День' })
      .getByRole('button', { name: /выходной/ })
    for (const day of await closedDays.all()) await expect(day).toBeDisabled()
  })
})
