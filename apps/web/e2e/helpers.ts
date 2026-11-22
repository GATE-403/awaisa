import { expect, type Locator, type Page } from '@playwright/test'

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4210'

const MIN_TAP_TARGET = 44

type CreatedBooking = {
  id: string
  token: string
}

const bookingSteps = (page: Page) => ({
  branch: page.locator('#step-branch'),
  service: page.locator('#step-service'),
  specialist: page.locator('#step-specialist'),
  datetime: page.locator('#step-datetime'),
  contacts: page.locator('#step-contacts'),
})

// Done steps lie in a stack; folded, a tap fans it out so each card's «Изменить» can be reached.
const editStep = async (page: Page, step: keyof ReturnType<typeof bookingSteps>) => {
  const reveal = page.getByRole('button', { name: 'Показать выбор' })
  if (await reveal.isVisible()) await reveal.click()
  await bookingSteps(page)[step].getByRole('button', { name: 'Изменить' }).click()
}

const primaryAction = (page: Page) =>
  page
    .getByRole('button', {
      name: /^(Выбрать услугу|Выбрать мастера|Любой мастер|Выбрать время|Выбрать \d{2}:\d{2}|Ввести контакты|Записаться|Записываем…)$/,
    })
    .filter({ visible: true })

// Everything filled: one press books (a quick time picked with one tap shows the check card,
// which carries its own «Записаться»).
const submitBooking = async (page: Page) => {
  await page.getByRole('button', { name: 'Записаться' }).filter({ visible: true }).first().click()
}

const pickFirstFreeSlot = async (page: Page) => {
  // A link with a time (e.g. «Ближайшее окно») already chose it: that is the slot.
  const preset = new URL(page.url()).searchParams.get('time')
  if (preset && (await page.locator('#step-datetime').textContent())?.includes(preset))
    return preset

  const days = page.getByRole('group', { name: 'День' }).getByRole('button')
  const dayCount = await days.count()

  for (let index = 0; index < dayCount; index += 1) {
    await days.nth(index).click()
    const slots = page
      .getByRole('group', { name: 'Время' })
      .getByRole('button', { disabled: false })
    const emptyHint = page.getByText('свободного времени нет')
    await slots.first().or(emptyHint).waitFor()
    if (await slots.count()) {
      const slot = slots.first()
      const time = (await slot.textContent())?.trim() ?? ''
      await slot.click()
      return time
    }
  }

  throw new Error('No free slots in the booking horizon')
}

const isInViewport = async (locator: Locator) => {
  const box = await locator.boundingBox()
  const viewport = locator.page().viewportSize()
  if (!box || !viewport) return false

  return box.y >= 0 && box.y + box.height <= viewport.height && box.width > 0
}

const getHorizontalOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

const findSmallTapTargets = (page: Page, scope = 'main') =>
  page.evaluate(
    ({ selector, minSize }) => {
      const root = document.querySelector(selector)
      if (!root) return []
      const controls = root.querySelectorAll<HTMLElement>(
        // Native mirrors that Base UI keeps for forms (aria-hidden, not focusable) are not controls.
        'button:not([disabled]), a[href], [role="radio"], input:not([type="hidden"]):not([aria-hidden="true"]):not([tabindex="-1"]), textarea, select',
      )

      return [...controls]
        .map((element) => element.closest('label') ?? element)
        .filter((element) => element.getClientRects().length > 0)
        .map((element) => {
          const { width, height } = element.getBoundingClientRect()
          return { text: element.textContent?.trim().slice(0, 40) ?? '', width, height }
        })
        .filter(({ width, height }) => width < minSize - 0.5 || height < minSize - 0.5)
    },
    { selector: scope, minSize: MIN_TAP_TARGET },
  )

const readStoredBookings = (page: Page) =>
  page.evaluate(() => {
    const raw = window.localStorage.getItem('awaisa:bookings:v2')
    return raw ? (JSON.parse(raw) as CreatedBooking[]) : []
  })

const cancelViaApi = async (booking: CreatedBooking) => {
  await fetch(`${API_URL}/bookings/${booking.id}`, {
    method: 'DELETE',
    headers: { 'x-booking-token': booking.token },
  })
}

// On phones the «Ближайшее окно» pill waits until the head's «Записаться» is off screen and the
// page is not moving down: scroll well past the head, then a little back up, like a reader would.
const revealNextSlot = async (page: Page) => {
  await page.locator('[data-place-book]').first().waitFor()
  await page.waitForLoadState('networkidle').catch(() => {})
  for (let step = 0; step < 4; step += 1) {
    await page.mouse.wheel(0, 600)
    await page.waitForTimeout(150)
  }
  await page.mouse.wheel(0, -200)
  await page.waitForTimeout(400)
}

// Sheets slide into place: a box measured mid-slide makes a drag start beside its target, which
// slow runners hit. Waits until the element stops moving and returns where it came to rest.
const settledBox = async (locator: Locator) => {
  let box = await locator.boundingBox()
  await expect
    .poll(
      async () => {
        const next = await locator.boundingBox()
        const isStill = Boolean(box && next && Math.abs(next.y - box.y) < 0.5)
        box = next
        return isStill
      },
      { intervals: [100] },
    )
    .toBe(true)
  return box
}

// The cabinet's «Новая запись» toasts come down over the top of the page (on phones over the day
// strip) and pause while the pointer rests on them; a person swipes one away, a test waits them out
// with the pointer off them.
const waitForToastsToLeave = async (page: Page) => {
  await page.mouse.move(0, 0)
  await expect(page.locator('[role="dialog"][data-type]')).toHaveCount(0, { timeout: 20_000 })
}

export {
  editStep,
  waitForToastsToLeave,
  settledBox,
  revealNextSlot,
  API_URL,
  MIN_TAP_TARGET,
  bookingSteps,
  cancelViaApi,
  findSmallTapTargets,
  getHorizontalOverflow,
  isInViewport,
  pickFirstFreeSlot,
  primaryAction,
  readStoredBookings,
  submitBooking,
}
