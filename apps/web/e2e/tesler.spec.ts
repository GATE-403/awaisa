import { type APIRequestContext, expect, test } from '@playwright/test'
import { mockCreateBooking, succeed } from './fixtures'
import { bookingSteps, pickFirstFreeSlot, primaryAction, submitBooking } from './helpers'

// Tesler's law: the complexity of a task cannot be removed, only moved. Whatever the system can
// work out itself must not be handed to the client. Covered elsewhere, not repeated here:
// - known contacts are not asked again: a signed-in client has no phone field (account.spec.ts),
//   a returning guest gets name and number filled in (visit-link.spec.ts);
// - search reads typos, the wrong keyboard layout and everyday words (catalog.spec.ts,
//   apps/api search-terms unit tests); phones in any spelling (inputMasks.test.ts, common/phone);
// - a mistake costs nothing: inputs survive errors, a taken time reloads the slots (ux.spec.ts).

const SLUG = 'awaisa-studio'
const TIME_ACTION = /^Выбрать (время|\d{2}:\d{2})$/

type Place = {
  business: { branches?: { id: string }[] }
  catalog: {
    services: { id: string; name: string }[]
    specialists: { id: string; name: string; serviceIds: string[] }[]
  }
}

const readPlace = async (request: APIRequestContext) =>
  (await (await request.get(`/api/businesses/${SLUG}`)).json()) as Place

test.describe("Tesler's law: the system takes the complexity it can", () => {
  test('a choice is asked only when there is more than one answer', async ({ page, request }) => {
    const { business, catalog } = await readPlace(request)
    const mastersOf = (serviceId: string) =>
      catalog.specialists.filter((master) => master.serviceIds.includes(serviceId))
    const solo = catalog.services.find((service) => mastersOf(service.id).length === 1)
    const shared = catalog.services.find((service) => mastersOf(service.id).length > 1)
    if (!solo || !shared) throw new Error(`${SLUG} needs a one-master and a shared service`)

    // One master: the step is filled in and the form goes straight to the time,
    // also when a link asks for «any master».
    const [master] = mastersOf(solo.id)
    const firstName = master?.name.split(' ')[0] ?? ''
    for (const query of [`service=${solo.id}`, `service=${solo.id}&specialist=any`]) {
      await page.goto(`/${SLUG}/book?${query}`)
      await expect(primaryAction(page), query).toHaveText(TIME_ACTION)
      await expect(bookingSteps(page).specialist, query).toContainText(firstName)
    }

    // Several masters: now there is something to choose, and the step asks.
    await page.goto(`/${SLUG}/book?service=${shared.id}`)
    await expect(primaryAction(page)).toHaveText('Выбрать мастера')
    expect(await bookingSteps(page).specialist.getByRole('radio').count()).toBeGreaterThan(1)

    // One branch: no «Куда приедете?» question at all.
    if ((business.branches?.length ?? 0) <= 1) {
      await expect(bookingSteps(page).branch).toHaveCount(0)
    }
  })

  test('the phone is taken in any spelling and formatted for the client', async ({ page }) => {
    const payloads = await mockCreateBooking(page, succeed)
    await page.goto(`/${SLUG}/book?service=styling&specialist=any`)
    await pickFirstFreeSlot(page)
    const phone = bookingSteps(page).contacts.getByLabel('Телефон')

    // A local number with the leading 0, digits in pairs, a pasted number with brackets and dashes.
    for (const typed of ['0555123456', '555 12 34 56', '+996 (555) 12-34-56']) {
      await phone.fill(typed)
      await expect(phone, typed).toHaveValue('+996 555 123 456')
    }

    await bookingSteps(page).contacts.getByLabel('Имя').fill('E2E Тест')
    await submitBooking(page)
    await expect(page.getByRole('heading', { name: 'Вы записаны' })).toBeVisible()
    const posted = payloads.at(-1) as { phone?: string } | undefined
    expect(posted?.phone?.replace(/\D/g, '')).toBe('996555123456')
  })

  test('a link that already chose everything asks only for contacts', async ({ page }) => {
    await page.goto(`/${SLUG}/book?service=styling&specialist=any`)
    const time = await pickFirstFreeSlot(page)
    const readDraftDate = () =>
      page.evaluate(() => {
        const raw = window.localStorage.getItem('awaisa:booking-draft:v1')
        return raw ? ((JSON.parse(raw) as { date?: string }).date ?? '') : ''
      })
    await expect.poll(readDraftDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    const date = await readDraftDate()

    // The same choice arriving from a link («Ближайшее окно», «Снова») needs no taps at all.
    await page.goto(`/${SLUG}/book?service=styling&specialist=any&date=${date}&time=${time}`)
    await expect(primaryAction(page)).toHaveText(/^(Ввести контакты|Записаться)$/)
    await expect(bookingSteps(page).contacts.getByLabel('Имя')).toBeVisible()
  })
})
