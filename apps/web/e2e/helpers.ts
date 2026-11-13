import type { Locator, Page } from '@playwright/test'

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4210'

const MIN_TAP_TARGET = 44

type CreatedBooking = {
  id: string
  token: string
}

const bookingSteps = (page: Page) => ({
  service: page.locator('#step-service'),
  specialist: page.locator('#step-specialist'),
  datetime: page.locator('#step-datetime'),
  contacts: page.locator('#step-contacts'),
})

const primaryAction = (page: Page) =>
  page
    .getByRole('button', { name: /^(Далее|Проверить запись|Записаться|Записываем…)$/ })
    .filter({ visible: true })

// Everything filled: the first press opens «Проверьте запись», the second books.
const submitBooking = async (page: Page) => {
  await primaryAction(page).click()
  await page.getByRole('heading', { name: 'Проверьте запись' }).waitFor()
  await page.getByRole('button', { name: 'Записаться' }).filter({ visible: true }).click()
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

export {
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
