import { expect, test } from '@playwright/test'
import { formatPhone, randomClientPhone, signInViaApi } from './account'
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
    await page.getByRole('button', { name: 'Создать страницу' }).click()

    await expect(page).toHaveURL(new RegExp(`/manage/${slug}\\?tab=services`))
    await expect(
      page.getByRole('heading', { name: 'Чтобы клиенты могли записаться' }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Добавить услугу' }).click()
    const serviceDialog = page.getByRole('dialog')
    await serviceDialog.getByLabel('Название').fill('Стрижка')
    await serviceDialog.getByLabel('Цена, сом').fill('700')
    await serviceDialog.getByRole('button', { name: 'Сохранить' }).click()
    await expect(page.getByRole('button', { name: /Стрижка/ })).toBeVisible()

    await page.getByRole('tab', { name: 'Мастера' }).click()
    await page.getByRole('button', { name: 'Добавить мастера' }).click()
    const masterDialog = page.getByRole('dialog')
    await masterDialog.getByLabel('Имя').fill('Азамат')
    await expect(masterDialog.getByRole('checkbox', { name: 'Стрижка' })).toBeChecked()
    await masterDialog.getByRole('button', { name: 'Сохранить' }).click()
    await expect(page.getByRole('heading', { name: 'Чтобы клиенты могли записаться' })).toHaveCount(
      0,
    )

    const client = await browser.newContext()
    const clientPage = await client.newPage()
    await clientPage.goto('/')
    await clientPage.getByRole('searchbox', { name: 'Поиск' }).fill(name)
    await clientPage.getByRole('searchbox', { name: 'Поиск' }).press('Enter')
    await clientPage.getByRole('link', { name: new RegExp(name) }).click()
    await expect(clientPage).toHaveURL(new RegExp(`/${slug}$`))
    await clientPage.getByRole('link', { name: 'Записаться' }).first().click()

    const steps = bookingSteps(clientPage)
    await steps.service.getByRole('radio', { name: /Стрижка/ }).click()
    await steps.specialist.getByRole('radio', { name: /Любой мастер/ }).click()
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

    await page.getByRole('tab', { name: 'Расписание' }).click()
    const day = page.locator(`[data-day="${booked}"]`)
    await day.waitFor()
    await day.click()
    const entry = page
      .getByRole('listitem')
      .filter({ hasText: formatPhone(clientPhone).replace(/ /g, '') })
    await expect(
      entry.or(page.getByRole('listitem').filter({ hasText: clientPhone })),
    ).toContainText(time)
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
