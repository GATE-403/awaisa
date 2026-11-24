import { type APIRequestContext, expect, type Page, test } from '@playwright/test'
import { mockCreateBooking, succeed } from './fixtures'
import { bookingSteps, pickFirstFreeSlot, primaryAction, submitBooking } from './helpers'

const LIMITS = {
  steps: 4,
  choicesPerDecision: 9,
  requiredTextFields: 2,
  happyPathActions: 7,
  wordsBeforeFirstChoice: 20,
  // English questions take a word more than the Russian ones did:
  // 'What are we doing?', 'Who would you like?'.
  stepTitleWords: 4,
  visiblePrimaryActions: 1,
}

const SLUG = 'awaisa-studio'
const TIME_ACTION = /^Choose (a time|\d{2}:\d{2})$/

type Place = {
  business: { branches?: { id: string }[] }
  catalog: {
    services: { id: string; name: string }[]
    specialists: { id: string; name: string; serviceIds: string[] }[]
  }
}

const readPlace = async (request: APIRequestContext) =>
  (await (await request.get(`/api/businesses/${SLUG}`)).json()) as Place

const countWords = (text: string) =>
  text.split(/\s+/).filter((word) => /[\p{L}\d]/u.test(word)).length

const countVisiblePrimaryButtons = (page: Page) =>
  page.evaluate(() => {
    // Inert content (the place's page dimmed under the booking sheet) cannot be acted on.
    const isVisible = (element: Element) => {
      const rect = element.getBoundingClientRect()
      return (
        rect.width > 0 &&
        rect.bottom > 0 &&
        rect.top < window.innerHeight &&
        !element.closest('[inert]')
      )
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
      // The sheet: a direct link also renders the place's page, dimmed, under it.
      const main = document.querySelector('[data-booking-screen]')
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

  test(`only ${LIMITS.requiredTextFields} fields are required - the rest is optional and says so`, async ({
    page,
  }) => {
    await page.goto('/awaisa-studio/book?service=styling')
    const steps = bookingSteps(page)
    await steps.specialist.getByRole('radio', { name: /Any specialist/ }).click()
    await pickFirstFreeSlot(page)

    const fields = steps.contacts.getByRole('textbox')
    const optional = steps.contacts.getByPlaceholder(/^(Optional|Enter)$/)
    // Booking with only these filled is the happy path below.
    expect((await fields.count()) - (await optional.count())).toBeLessThanOrEqual(
      LIMITS.requiredTextFields,
    )
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
    await act(() => steps.specialist.getByRole('radio', { name: /Any specialist/ }).click())

    const todaySlot = steps.datetime
      .getByRole('group', { name: 'Time' })
      .getByRole('button', { disabled: false })
      .first()
    await todaySlot.or(page.getByText('This day is fully booked')).waitFor()
    if (await todaySlot.count()) await act(() => todaySlot.click())
    else {
      actions += 1
      await pickFirstFreeSlot(page)
    }

    await act(() => steps.contacts.getByLabel('Name').fill('E2E Тест'))
    await act(() => steps.contacts.getByLabel('Phone').fill('+996 555 000 111'))
    // Everything filled: one press books.
    await act(() => primaryAction(page).click())

    await expect(page.getByRole('heading', { name: 'You are booked' })).toBeVisible()
    expect(actions).toBeLessThanOrEqual(LIMITS.happyPathActions)
  })

  test('price and duration are visible before committing - no surprises', async ({ page }) => {
    await page.goto('/awaisa-studio/book')
    const steps = bookingSteps(page)
    const option = steps.service.getByRole('radio', { name: /Укладка/ })
    const card = steps.service
      .locator('label')
      .filter({ has: page.getByRole('radio', { name: /Укладка/ }) })

    await expect(card).toContainText(/\d[\d,]*\ssom/)
    await expect(card).toContainText(/\d+\s?(min|h)\b/)
    await option.click()
    await expect(
      page
        .getByText(/\d[\d,]*\ssom/)
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
      // The page under the booking sheet goes inert once the sheet has slid up, not before.
      if (path.endsWith('/book'))
        await page.locator('[inert]').first().waitFor({ state: 'attached' })
      expect(await countVisiblePrimaryButtons(page), path).toBeLessThanOrEqual(
        LIMITS.visiblePrimaryActions,
      )
    }
  })

  test('the action names the next step and the bar says what is chosen', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'The line lives in the phone action bar')
    await page.goto('/awaisa-studio/book')
    const steps = bookingSteps(page)
    const action = primaryAction(page)
    const hint = page.locator('[aria-live="polite"]').filter({ visible: true }).last()

    await expect(action).toHaveText('Choose a service')
    // Nothing chosen: the place. The step count lives over the question, not twice.
    await expect(hint).not.toContainText('Step')
    await steps.service.getByRole('radio', { name: /Укладка/ }).click()
    // On the masters the action takes the usual choice and says so.
    await expect(action).toHaveText('Any specialist')
    await expect(hint).toHaveText(/^Укладка/)
    await steps.specialist.getByRole('radio', { name: /Any specialist/ }).click()
    // On the time step the action offers the time under the ruler's needle.
    await expect(action).toHaveText(TIME_ACTION)
    await pickFirstFreeSlot(page)
    await expect(action).toHaveText('Enter contacts')
    await expect(hint).toHaveText(/^Укладка · Any specialist · .+, \d{2}:\d{2}$/)
  })
})

// Tesler's law: the complexity of a task cannot be removed, only moved. Whatever the system can
// work out itself must not be handed to the client. Covered elsewhere, not repeated here:
// - known contacts are not asked again: a signed-in client has no phone field (account.spec.ts),
//   a returning guest gets name and number filled in (visit-link.spec.ts);
// - search reads typos, the wrong keyboard layout and everyday words (catalog.spec.ts,
//   apps/api search-terms unit tests); phones in any spelling (inputMasks.test.ts, common/phone);
// - a link with a time opens on the contacts (booking-flow.spec.ts);
// - a mistake costs nothing: inputs survive errors, a taken time reloads the slots (ux.spec.ts).

test.describe("Tesler's law: the system takes the complexity it can", () => {
  test('a choice is asked only when there is more than one answer', async ({ page, request }) => {
    const { business, catalog } = await readPlace(request)
    const mastersOf = (serviceId: string) =>
      catalog.specialists.filter((master) => master.serviceIds.includes(serviceId))
    const solo = catalog.services.find((service) => mastersOf(service.id).length === 1)
    const shared = catalog.services.find((service) => mastersOf(service.id).length > 1)
    if (!solo || !shared) throw new Error(`${SLUG} needs a one-master and a shared service`)

    // One master: the step is filled in and the form goes straight to the time,
    // also when a link asks for “any specialist”.
    const [master] = mastersOf(solo.id)
    const firstName = master?.name.split(' ')[0] ?? ''
    for (const query of [`service=${solo.id}`, `service=${solo.id}&specialist=any`]) {
      await page.goto(`/${SLUG}/book?${query}`)
      await expect(primaryAction(page), query).toHaveText(TIME_ACTION)
      await expect(bookingSteps(page).specialist, query).toContainText(firstName)
    }

    // Several masters: now there is something to choose, and the step asks; its action offers
    // the usual choice, “Any specialist”.
    await page.goto(`/${SLUG}/book?service=${shared.id}`)
    await expect(primaryAction(page)).toHaveText('Any specialist')
    expect(await bookingSteps(page).specialist.getByRole('radio').count()).toBeGreaterThan(1)

    // One branch: no “Which branch?” question at all.
    if ((business.branches?.length ?? 0) <= 1) {
      await expect(bookingSteps(page).branch).toHaveCount(0)
    }
  })

  test('the phone is taken in any spelling and formatted for the client', async ({ page }) => {
    const payloads = await mockCreateBooking(page, succeed)
    await page.goto(`/${SLUG}/book?service=styling&specialist=any`)
    await pickFirstFreeSlot(page)
    const phone = bookingSteps(page).contacts.getByLabel('Phone')

    // A local number with the leading 0 (other spellings: inputMasks.test.ts).
    await phone.fill('0555123456')
    await expect(phone).toHaveValue('+996 555 123 456')

    await bookingSteps(page).contacts.getByLabel('Name').fill('E2E Тест')
    await submitBooking(page)
    await expect(page.getByRole('heading', { name: 'You are booked' })).toBeVisible()
    const posted = payloads.at(-1) as { phone?: string } | undefined
    expect(posted?.phone?.replace(/\D/g, '')).toBe('996555123456')
  })
})
