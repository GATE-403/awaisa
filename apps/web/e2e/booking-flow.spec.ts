import { expect, test } from '@playwright/test'
import {
  bookingSteps,
  cancelViaApi,
  pickFirstFreeSlot,
  primaryAction,
  readStoredBookings,
  revealNextSlot,
  submitBooking,
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
    // Services lead the catalog; places are the second tab.
    await page.getByRole('tab', { name: /Места/ }).click()
    // The business card (not an offer inside the banner) leads to the business page.
    await page.locator('a[href="/awaisa-studio"]').first().click()
    await expect(page).toHaveURL(/\/awaisa-studio$/)
    await revealNextSlot(page)
    const nextSlot = page.getByRole('complementary', { name: 'Ближайшее окно' })

    await expect(nextSlot.getByText(/^(Сегодня|Завтра), \d{2}:\d{2}$|появятся скоро/)).toBeVisible()
    await nextSlot.getByRole('link', { name: /^Записаться/ }).click()

    await expect(page).toHaveURL(/\/book\?service=/)
    const steps = bookingSteps(page)
    await expect(steps.service.getByRole('button', { name: 'Изменить' })).toBeVisible()
    await expect(primaryAction(page)).toHaveText(/^(Выбрать (мастера|время)|Ввести контакты)$/)
  })

  test('a time shown on the business page is the time the booking opens with', async ({ page }) => {
    await page.goto('/awaisa-studio')
    await revealNextSlot(page)
    const card = page
      .getByRole('complementary', { name: 'Ближайшее окно' })
      .getByRole('link', { name: /^Записаться на/ })
    // The card links to its time once the first free slot is known.
    await expect(card).toHaveAttribute('href', /time=\d{2}:\d{2}/)
    const href = (await card.getAttribute('href')) ?? ''
    const time = new URL(href, 'http://local').searchParams.get('time') ?? ''
    await card.click()

    await expect(page).toHaveURL(/\/book\?service=.*time=/)
    const steps = bookingSteps(page)
    await expect(steps.datetime).toContainText(time)
    await expect(steps.contacts.getByLabel('Имя')).toBeVisible()
  })

  test('full booking: service → master → time → contacts → ticket → cancel', async ({ page }) => {
    await page.goto('/awaisa-studio/book')
    const steps = bookingSteps(page)

    await steps.service.getByRole('radio', { name: /Мужская стрижка/ }).click()
    await expect(steps.service).toContainText('Мужская стрижка')

    // A service with a single master skips the choice; otherwise take anyone free.
    const anyMaster = steps.specialist.getByRole('radio', { name: /Любой мастер/ })
    if (await anyMaster.isVisible()) await anyMaster.click()
    const time = await pickFirstFreeSlot(page)

    await expect(steps.datetime).toContainText(time)
    await steps.contacts.getByLabel('Имя').fill('E2E Тест')
    await steps.contacts.getByLabel('Телефон').fill('+996 555 000 111')
    await expect(primaryAction(page)).toHaveText('Записаться')
    await submitBooking(page)

    await expect(page.getByRole('heading', { name: 'Вы записаны' })).toBeVisible()
    // No toast over the success screen: it says in plain words what to do next.
    await expect(page.getByText(new RegExp(`Приходите к ${time}`))).toBeVisible()
    await expect(page.getByRole('article', { name: /^Запись / })).toContainText(time)

    await page.getByRole('main').getByRole('link', { name: 'Мои записи' }).click()
    await expect(page).toHaveURL(/\/bookings$/)
    const ticket = page.getByRole('article', { name: /^Запись / }).first()
    await expect(ticket).toContainText('Мужская стрижка')

    // The ticket alone, large, with a way to save it — like showing it at the door.
    await ticket.getByRole('button', { name: 'Показать талон' }).click()
    const ticketSheet = page.getByRole('dialog', { name: 'Талон' })
    await expect(ticketSheet.getByRole('article', { name: /^Запись / })).toBeVisible()
    await expect(ticketSheet.getByRole('button', { name: 'Скачать', exact: true })).toBeEnabled()
    await ticketSheet.getByRole('button', { name: 'Закрыть' }).click()
    // Sheets also close by pulling the top bar down.
    await ticket.getByRole('button', { name: 'Показать талон' }).click()
    const title = ticketSheet.getByRole('heading', { name: 'Талон' })
    const box = await title.boundingBox()
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width / 2, box.y + 220, { steps: 6 })
      await page.mouse.up()
    }
    await expect(ticketSheet).toHaveCount(0)

    // Cancelling is immediate (from the pass's «⋯» menu); «Вернуть» in the toast undoes it.
    const cancelFromMenu = async () => {
      await ticket.getByRole('button', { name: 'Ещё' }).click()
      await page.getByRole('menuitem', { name: 'Отменить запись' }).click()
    }
    await cancelFromMenu()
    await expect(ticket.getByText('Отменена')).toBeVisible()
    await page.getByRole('button', { name: 'Вернуть' }).click()
    await expect(ticket.getByText('Отменена')).toHaveCount(0)
    await expect(page.getByRole('region', { name: /Notifications/ })).toContainText(
      'Запись возвращена',
    )

    await cancelFromMenu()
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

  test('a booking left half-way can be continued from any page', async ({ page }) => {
    await page.goto('/awaisa-studio/book')
    await bookingSteps(page)
      .service.getByRole('radio', { name: /Укладка/ })
      .click()
    await page.goto('/')

    const resume = page.getByRole('complementary', { name: 'Незаконченная запись' })
    await expect(resume).toContainText('Укладка')
    await resume.getByRole('link', { name: /Продолжить запись/ }).click()
    await expect(page).toHaveURL(/\/awaisa-studio\/book\?service=styling/)
    await expect(bookingSteps(page).service).toContainText('Укладка')
  })
})

test.describe('Booking: helpful defaults', () => {
  test('a shared location picks the nearest branch; each service says when one can come', async ({
    page,
    context,
  }) => {
    // Lumière (demo seed) has two branches: Асанбай and Ала-Арча; this point is by Ала-Арча.
    await context.grantPermissions(['geolocation'])
    await context.setGeolocation({ latitude: 42.848, longitude: 74.6015 })
    await page.goto('/lumiere-salon/book')

    const branches = page.getByRole('group', { name: 'Филиал' })
    await expect(branches.getByRole('radio', { name: /Ала-Арча/ })).toBeChecked()
    // Each branch says its address and how far it is; the route leads to the chosen one.
    await expect(branches.getByText(/ · \d+ м$/).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Маршрут до «Ала-Арча» ›' })).toBeVisible()

    // At least one service row names its first free time today or tomorrow.
    await expect(
      bookingSteps(page)
        .service.getByText(/^(Сегодня|Завтра) с \d{2}:\d{2}/)
        .first(),
    ).toBeVisible()
  })
})
