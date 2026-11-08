import { expect, test } from '@playwright/test'
import {
  bookingSteps,
  cancelViaApi,
  pickFirstFreeSlot,
  primaryAction,
  readStoredBookings,
} from './helpers'

test.describe('User flow: booking', () => {
  test.afterEach(async ({ page }) => {
    const stored = await readStoredBookings(page).catch(() => [])
    await Promise.all(stored.map(cancelViaApi))
  })

  test('catalog → business → next free slot → booking with the service preselected', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /Awaisa Studio/ }).click()
    await expect(page).toHaveURL(/\/awaisa-studio$/)
    const nextSlot = page.getByRole('complementary', { name: 'Ближайшее окно' })

    await expect(nextSlot.getByText(/(Сегодня|Завтра) в \d{2}:\d{2}|появятся скоро/)).toBeVisible()
    await nextSlot.getByRole('link', { name: 'Записаться' }).click()

    await expect(page).toHaveURL(/\/book\?service=/)
    const steps = bookingSteps(page)
    await expect(steps.service.getByRole('button', { name: 'Изменить' })).toBeVisible()
    await expect(primaryAction(page)).toHaveText('Далее')
  })

  test('full booking: service → master → time → contacts → ticket → cancel', async ({ page }) => {
    await page.goto('/awaisa-studio/book')
    const steps = bookingSteps(page)

    await steps.service.getByRole('radio', { name: /Мужская стрижка/ }).click()
    await expect(steps.service).toContainText('Мужская стрижка')

    await steps.specialist.getByRole('radio', { name: /Любой мастер/ }).click()
    const time = await pickFirstFreeSlot(page)

    await expect(steps.datetime).toContainText(time)
    await steps.contacts.getByLabel('Имя').fill('E2E Тест')
    await steps.contacts.getByLabel('Телефон').fill('+996 555 000 111')
    await expect(primaryAction(page)).toHaveText('Записаться')
    await primaryAction(page).click()

    await expect(page.getByRole('heading', { name: 'Вы записаны' })).toBeVisible()
    await expect(page.getByRole('region', { name: /Notifications/ })).toContainText(
      'Запись подтверждена',
    )
    await expect(page.getByRole('article', { name: /^Запись / })).toContainText(time)

    await page.getByRole('main').getByRole('link', { name: 'Мои записи' }).click()
    await expect(page).toHaveURL(/\/bookings$/)
    const ticket = page.getByRole('article', { name: /^Запись / }).first()
    await expect(ticket).toContainText('Мужская стрижка')

    await ticket.getByRole('button', { name: 'Отменить запись' }).click()
    const confirm = page.getByRole('alertdialog')
    await expect(confirm).toBeVisible()
    await confirm.getByRole('button', { name: 'Отменить запись' }).click()

    await expect(ticket.getByText('Отменена')).toBeVisible()
    await expect(ticket.getByRole('button', { name: 'Убрать из списка' })).toBeVisible()
  })

  test('master page link preselects the master and narrows services', async ({ page }) => {
    await page.goto('/awaisa-studio')
    await page.getByRole('link', { name: /Тимур Абдыкадыров/ }).click()

    await expect(page).toHaveURL(/specialist=timur/)
    const steps = bookingSteps(page)
    await expect(steps.service.getByRole('radio')).toHaveCount(2)
    await steps.service.getByRole('radio').first().click()
    await expect(steps.specialist).toContainText('Тимур Абдыкадыров')
    await expect(
      steps.datetime
        .getByRole('group', { name: 'Время' })
        .or(steps.datetime.getByText('свободного времени нет')),
    ).toBeVisible()
  })

  test('services catalog → book a specific service', async ({ page }) => {
    await page.goto('/awaisa-studio/services')
    await page.getByRole('link', { name: /Педикюр/ }).click()

    await expect(page).toHaveURL(/\/awaisa-studio\/book\?service=pedicure/)
    await expect(bookingSteps(page).service).toContainText('Педикюр')
  })
})
