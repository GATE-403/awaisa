import { expect, test } from '@playwright/test'
import { conflict, mockCreateBooking, succeed } from './fixtures'
import {
  bookingSteps,
  findSmallTapTargets,
  getHorizontalOverflow,
  isInViewport,
  pickFirstFreeSlot,
  primaryAction,
  submitBooking,
} from './helpers'

const fillContacts = async (page: import('@playwright/test').Page) => {
  const { contacts } = bookingSteps(page)
  await contacts.getByLabel('Имя').fill('E2E Тест')
  await contacts.getByLabel('Телефон').fill('+996 555 000 111')
}

test.describe('UX: guidance and feedback', () => {
  test('the main action is never disabled and leads to the first unfinished step', async ({
    page,
  }) => {
    await page.goto('/awaisa-studio/book')
    const steps = bookingSteps(page)
    const action = primaryAction(page)

    await expect(action).toBeEnabled()
    await expect(
      page.getByText('Выберите услугу', { exact: true }).filter({ visible: true }),
    ).toBeVisible()
    await action.click()
    await expect(steps.service).toBeInViewport()

    await steps.service.getByRole('radio', { name: /Укладка/ }).click()
    await expect(
      page.getByText('Выберите мастера', { exact: true }).filter({ visible: true }),
    ).toBeVisible()
    await action.click()
    await expect(steps.specialist).toBeInViewport()
  })

  test('the main action stays on screen at every step on phones', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Phones only: desktop uses a sticky summary card')
    await mockCreateBooking(page, succeed)
    await page.goto('/awaisa-studio/book')
    const steps = bookingSteps(page)
    const action = primaryAction(page)

    // The booking screen slides up as a sheet; the bar is on screen once it has settled.
    await expect.poll(() => isInViewport(action)).toBe(true)
    await steps.service.getByRole('radio', { name: /Укладка/ }).click()
    expect(await isInViewport(action)).toBe(true)
    await steps.specialist.getByRole('radio', { name: /Любой мастер/ }).click()
    expect(await isInViewport(action)).toBe(true)
    await pickFirstFreeSlot(page)
    expect(await isInViewport(action)).toBe(true)
    await page.getByLabel('Телефон').focus()
    expect(await isInViewport(action)).toBe(true)
  })

  test('no validation errors before the first submit attempt', async ({ page }) => {
    await page.goto('/awaisa-studio/book?service=styling')
    const { contacts } = bookingSteps(page)

    await contacts.getByLabel('Имя').fill('А')
    await contacts.getByLabel('Имя').fill('')
    await contacts.getByLabel('Телефон').fill('12')

    await expect(page.getByText('Укажите имя')).toHaveCount(0)
    await expect(page.getByText('Укажите номер')).toHaveCount(0)
  })

  test('contact errors are inline, human and keep what was typed', async ({ page }) => {
    await page.goto('/awaisa-studio/book?service=styling')
    const steps = bookingSteps(page)
    await steps.specialist.getByRole('radio', { name: /Любой мастер/ }).click()
    await pickFirstFreeSlot(page)
    await steps.contacts.getByLabel('Телефон').fill('555')

    await primaryAction(page).click()

    await expect(steps.contacts.getByText('Укажите имя')).toBeVisible()
    await expect(
      steps.contacts.getByText('Укажите номер, чтобы мы подтвердили запись'),
    ).toBeVisible()
    await expect(steps.contacts.getByLabel('Телефон')).toHaveValue('+996 555')
    await expect(steps.contacts.getByLabel('Имя')).toHaveAttribute('aria-invalid', 'true')
    await expect(steps.contacts).toBeInViewport()
  })

  test('a taken slot (409) explains itself, keeps contacts and asks for a new time', async ({
    page,
  }) => {
    await mockCreateBooking(page, (route) => conflict(route))
    await page.goto('/awaisa-studio/book?service=styling')
    const steps = bookingSteps(page)
    await steps.specialist.getByRole('radio', { name: /Любой мастер/ }).click()
    const time = await pickFirstFreeSlot(page)
    await fillContacts(page)

    const slotsReload = page.waitForRequest(/\/api\/availability/)
    await submitBooking(page)
    await slotsReload

    await expect(
      page.getByText('Это время только что заняли').filter({ visible: true }).first(),
    ).toBeVisible()
    await expect(steps.datetime).toBeInViewport()
    await expect(steps.datetime.getByRole('button', { name: time, pressed: true })).toHaveCount(0)
    await expect(steps.contacts.getByLabel('Имя')).toHaveValue('E2E Тест')
    await expect(primaryAction(page)).toHaveText('Далее')
  })

  test('slot loading failure offers a retry instead of a dead end', async ({ page }) => {
    let failures = 1
    await page.route('**/api/availability**', (route) => {
      if (failures > 0) {
        failures -= 1
        return route.fulfill({ status: 503, json: { message: 'Сервис временно недоступен' } })
      }
      return route.fallback()
    })
    await page.goto('/awaisa-studio/book?service=styling')
    await bookingSteps(page)
      .specialist.getByRole('radio', { name: /Любой мастер/ })
      .click()

    await expect(page.getByText('Сервис временно недоступен')).toBeVisible()
    await page.getByRole('button', { name: 'Повторить' }).click()
    await expect(
      page.getByRole('group', { name: 'Время' }).or(page.getByText('свободного времени нет')),
    ).toBeVisible()
  })

  test('finished steps collapse to one line and can be reopened', async ({ page }) => {
    await page.goto('/awaisa-studio/book')
    const steps = bookingSteps(page)
    await steps.service.getByRole('radio', { name: /Маникюр/ }).click()

    await expect(steps.service.getByRole('radio')).toHaveCount(0)
    await expect(steps.service).toContainText('Маникюр с покрытием')
    await steps.service.getByRole('button', { name: 'Изменить' }).click()
    await expect(steps.service.getByRole('radio', { name: /Маникюр/ })).toBeChecked()
  })

  test('changing the service keeps a compatible master but drops the chosen time', async ({
    page,
  }) => {
    await page.goto('/awaisa-studio/book?service=haircut-women')
    const steps = bookingSteps(page)
    await steps.specialist.getByRole('radio', { name: /Айгерим/ }).click()
    await pickFirstFreeSlot(page)

    await steps.service.getByRole('button', { name: 'Изменить' }).click()
    await steps.service.getByRole('radio', { name: /Укладка/ }).click()

    await expect(steps.specialist).toContainText('Айгерим Садыкова')
    await expect(steps.datetime.getByRole('button', { name: 'Изменить' })).toHaveCount(0)
  })

  test('success screen gives next steps: calendar, route, my bookings', async ({ page }) => {
    await mockCreateBooking(page, succeed)
    await page.goto('/awaisa-studio/book?service=styling')
    await bookingSteps(page)
      .specialist.getByRole('radio', { name: /Любой мастер/ })
      .click()
    await pickFirstFreeSlot(page)
    await fillContacts(page)
    await submitBooking(page)

    await expect(page.getByRole('heading', { name: 'Вы записаны' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'В календарь' })).toBeVisible()
    await expect(page.getByRole('main').getByRole('link', { name: 'Маршрут' })).toBeVisible()
    await expect(page.getByRole('main').getByRole('link', { name: 'Мои записи' })).toBeVisible()
  })
})

test.describe('UX: layout and ergonomics', () => {
  for (const width of [320, 375, 768, 1024]) {
    test(`no horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      for (const path of [
        '/',
        '/awaisa-studio',
        '/awaisa-studio/services',
        '/awaisa-studio/book',
        '/bookings',
        '/business',
        '/map',
      ]) {
        await page.goto(path)
        // Map tiles keep the network busy; a short wait is enough for the page itself.
        await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined)
        expect(await getHorizontalOverflow(page), path).toBeLessThanOrEqual(0)
      }
    })
  }

  test('booking controls are at least 44×44 on phones', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Touch targets matter on touch screens')
    await page.goto('/awaisa-studio/book?service=styling')
    await bookingSteps(page)
      .specialist.getByRole('radio', { name: /Любой мастер/ })
      .click()
    await page
      .getByRole('group', { name: 'Время' })
      .or(page.getByText('свободного времени нет'))
      .waitFor()

    expect(await findSmallTapTargets(page)).toEqual([])
  })

  test('the whole booking can be done with a keyboard', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Keyboard flow is a desktop concern')
    await mockCreateBooking(page, succeed)
    await page.goto('/awaisa-studio/book')

    await page.getByRole('radio', { name: /Женская стрижка/ }).focus()
    await page.keyboard.press('Space')
    await expect(bookingSteps(page).service).toContainText('Женская стрижка')

    await page.getByRole('radio', { name: /Любой мастер/ }).focus()
    await page.keyboard.press('Space')
    const freeSlot = page
      .getByRole('group', { name: 'Время' })
      .getByRole('button', { disabled: false })
      .first()
    await freeSlot.or(page.getByText('свободного времени нет')).waitFor()
    test.skip((await freeSlot.count()) === 0, 'No free slots today')
    await freeSlot.focus()
    await page.keyboard.press('Enter')

    await page.getByLabel('Имя').focus()
    await page.keyboard.type('E2E Тест')
    await page.keyboard.press('Tab')
    await page.keyboard.type('+996555000111')
    await primaryAction(page).focus()
    await page.keyboard.press('Enter')

    await expect(page.getByRole('heading', { name: 'Вы записаны' })).toBeVisible()
  })

  // Next keeps visited routes in the DOM (hidden): the booking sheet's scroll lock must not
  // outlive it, or every page after it stops scrolling.
  test('closing the booking screen gives the page its scroll back', async ({ page }) => {
    await page.goto('/awaisa-studio')
    await page.locator('a[href*="/book?service="]').first().click()
    await page.waitForURL(/\/book\?/)
    await expect
      .poll(() => page.evaluate(() => document.documentElement.style.overflow))
      .toBe('hidden')
    await page.getByRole('link', { name: 'Закрыть запись' }).click()
    await page.waitForURL(/awaisa-studio$/)
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.documentElement).overflow))
      .not.toBe('hidden')
    await page.mouse.wheel(0, 600)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  })
})
