import { expect, type Page, test } from '@playwright/test'
import { mockCreateBooking, succeed } from './fixtures'
import { bookingSteps, pickFirstFreeSlot, primaryAction, submitBooking } from './helpers'

const LIMITS = {
  steps: 4,
  choicesPerDecision: 9,
  requiredTextFields: 2,
  happyPathActions: 7,
  wordsBeforeFirstChoice: 20,
  stepTitleWords: 3,
  visiblePrimaryActions: 1,
}

const countWords = (text: string) =>
  text.split(/\s+/).filter((word) => /[\p{L}\d]/u.test(word)).length

const countVisiblePrimaryButtons = (page: Page) =>
  page.evaluate(() => {
    const isVisible = (element: Element) => {
      const rect = element.getBoundingClientRect()
      return rect.width > 0 && rect.bottom > 0 && rect.top < window.innerHeight
    }

    return [...document.querySelectorAll('[data-variant="primary"]')].filter(isVisible).length
  })

test.describe('Cognitive load: booking', () => {
  test(`at most ${LIMITS.steps} steps, each named in ≤ ${LIMITS.stepTitleWords} words`, async ({
    page,
  }) => {
    await page.goto('/awaisa-studio/book')
    const titles = await page.locator('section[id^="step-"] h2').allTextContents()

    expect(titles.length).toBeLessThanOrEqual(LIMITS.steps)
    for (const title of titles)
      expect(countWords(title), title).toBeLessThanOrEqual(LIMITS.stepTitleWords)
  })

  test(`every decision offers ≤ ${LIMITS.choicesPerDecision} options at once`, async ({ page }) => {
    await page.goto('/awaisa-studio/book')
    const steps = bookingSteps(page)

    expect(await steps.service.getByRole('radio').count()).toBeLessThanOrEqual(
      LIMITS.choicesPerDecision,
    )
    await steps.service.getByRole('radio').first().click()
    expect(await steps.specialist.getByRole('radio').count()).toBeLessThanOrEqual(
      LIMITS.choicesPerDecision,
    )
  })

  test('the first choice is reachable without reading a wall of text', async ({ page }) => {
    await page.goto('/awaisa-studio/book')
    const words = await page.evaluate(() => {
      const main = document.querySelector('main')
      const firstChoice = document
        .querySelector('#step-service input[type="radio"]')
        ?.closest('label')
      if (!main || !firstChoice) return Number.POSITIVE_INFINITY
      const range = document.createRange()
      range.setStartBefore(main)
      range.setEndBefore(firstChoice)

      return range
        .toString()
        .split(/\s+/)
        .filter((word) => /[\p{L}\d]/u.test(word)).length
    })

    expect(words).toBeLessThanOrEqual(LIMITS.wordsBeforeFirstChoice)
  })

  test(`only ${LIMITS.requiredTextFields} fields are required — the rest is optional and says so`, async ({
    page,
  }) => {
    await mockCreateBooking(page, succeed)
    await page.goto('/awaisa-studio/book?service=styling')
    const steps = bookingSteps(page)
    await steps.specialist.getByRole('radio', { name: /Любой мастер/ }).click()
    await pickFirstFreeSlot(page)

    const fields = steps.contacts.getByRole('textbox')
    const optional = steps.contacts.getByPlaceholder(/^(Необязательно|Ввести)$/)
    expect((await fields.count()) - (await optional.count())).toBeLessThanOrEqual(
      LIMITS.requiredTextFields,
    )

    await steps.contacts.getByLabel('Имя').fill('E2E Тест')
    await steps.contacts.getByLabel('Телефон').fill('+996 555 000 111')
    await submitBooking(page)
    await expect(page.getByRole('heading', { name: 'Вы записаны' })).toBeVisible()
  })

  test(`happy path takes ≤ ${LIMITS.happyPathActions} actions`, async ({ page }) => {
    await mockCreateBooking(page, succeed)
    await page.goto('/awaisa-studio/book')
    const steps = bookingSteps(page)
    let actions = 0
    const act = async (action: () => Promise<unknown>) => {
      actions += 1
      await action()
    }

    await act(() => steps.service.getByRole('radio', { name: /Укладка/ }).click())
    await act(() => steps.specialist.getByRole('radio', { name: /Любой мастер/ }).click())

    const todaySlot = steps.datetime
      .getByRole('group', { name: 'Время' })
      .getByRole('button', { disabled: false })
      .first()
    await todaySlot.or(page.getByText('свободного времени нет')).waitFor()
    if (await todaySlot.count()) await act(() => todaySlot.click())
    else {
      actions += 1
      await pickFirstFreeSlot(page)
    }

    await act(() => steps.contacts.getByLabel('Имя').fill('E2E Тест'))
    await act(() => steps.contacts.getByLabel('Телефон').fill('+996 555 000 111'))
    // Everything filled: one press books.
    await act(() => primaryAction(page).click())

    await expect(page.getByRole('heading', { name: 'Вы записаны' })).toBeVisible()
    expect(actions).toBeLessThanOrEqual(LIMITS.happyPathActions)
  })

  test('price and duration are visible before committing — no surprises', async ({ page }) => {
    await page.goto('/awaisa-studio/book')
    const steps = bookingSteps(page)
    const option = steps.service.getByRole('radio', { name: /Укладка/ })
    const card = steps.service
      .locator('label')
      .filter({ has: page.getByRole('radio', { name: /Укладка/ }) })

    await expect(card).toContainText(/\d[\d\s]*\sсом/)
    await expect(card).toContainText(/\d+\s?(мин|ч)/)
    await option.click()
    await expect(
      page
        .getByText(/\d[\d\s]*\sсом/)
        .filter({ visible: true })
        .first(),
    ).toBeVisible()
  })

  test(`never more than ${LIMITS.visiblePrimaryActions} primary action on screen`, async ({
    page,
  }) => {
    for (const path of [
      '/',
      '/awaisa-studio',
      '/awaisa-studio/services',
      '/awaisa-studio/book',
      '/business',
    ]) {
      await page.goto(path)
      // Map tiles keep the network busy; a short wait is enough for the page itself.
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined)
      expect(await countVisiblePrimaryButtons(page), path).toBeLessThanOrEqual(
        LIMITS.visiblePrimaryActions,
      )
    }
  })

  test('the action names the next step and the bar says how far along', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'The step count lives in the phone action bar')
    await page.goto('/awaisa-studio/book')
    const steps = bookingSteps(page)
    const action = primaryAction(page)
    const hint = page.locator('[aria-live="polite"]').filter({ visible: true }).last()

    await expect(action).toHaveText('Выбрать услугу')
    await expect(hint).toHaveText('Шаг 1 из 4')
    await steps.service.getByRole('radio', { name: /Укладка/ }).click()
    await expect(action).toHaveText('Выбрать мастера')
    await expect(hint).toHaveText('Шаг 2 из 4')
    await steps.specialist.getByRole('radio', { name: /Любой мастер/ }).click()
    // On the time step the action offers the time under the ruler's needle.
    await expect(action).toHaveText(/^Выбрать (время|\d{2}:\d{2})$/)
    await pickFirstFreeSlot(page)
    await expect(action).toHaveText('Ввести контакты')
    await expect(hint).toHaveText('Шаг 4 из 4')
  })
})
