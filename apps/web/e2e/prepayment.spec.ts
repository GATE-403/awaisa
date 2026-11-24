import { expect, test } from '@playwright/test'
import { adminPhone, randomClientPhone, signInViaApi } from './account'
import { API_URL, bookingSteps, pickFirstFreeSlot, submitBooking } from './helpers'
import { withDb } from './visits'

const SLUG = 'awaisa-studio'
const DEPOSIT = 500

type Slot = { time: string; isAvailable: boolean }
type Service = {
  id: string
  categoryId: string
  name: string
  description: string
  durationMinutes: number
  price: number
  deposit?: number | null
  isPopular: boolean
  isActive?: boolean
}

test.describe('Prepayment', () => {
  test('a deposit service: pay at the checkout, or the held slot is released', async ({
    page,
    browser,
    isMobile,
  }, testInfo) => {
    test.skip(isMobile, 'Runs once: it changes a service')
    test.setTimeout(150_000)
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    const business = await (await fetch(`${API_URL}/businesses/${SLUG}`)).json()
    const master = business.catalog.specialists.at(-1)
    const managed = await (await page.request.get(`/api/manage/${SLUG}`)).json()
    const service: Service = managed.catalog.services.find(
      (item: Service) => item.id === master.serviceIds[0],
    )
    const saveService = (deposit: number | null) =>
      page.request.put(`/api/manage/${SLUG}/services/${service.id}`, {
        data: {
          categoryId: service.categoryId,
          name: service.name,
          description: service.description,
          durationMinutes: service.durationMinutes,
          price: service.price,
          isPopular: service.isPopular,
          isActive: service.isActive ?? true,
          deposit,
        },
      })
    const slotsOn = async (date: string) => {
      const response = await fetch(
        `${API_URL}/availability?serviceId=${service.id}&specialistId=${master.id}&date=${date}`,
      )
      return ((await response.json()).slots as Slot[]).filter((slot) => slot.isAvailable)
    }
    const guest = await browser.newContext()
    const guestPage = await guest.newPage()

    try {
      expect((await saveService(DEPOSIT)).ok()).toBe(true)

      // 1. Through the form: the summary names the deposit, booking leads to the checkout,
      //    paying confirms the visit and the profile says so.
      await guestPage.goto(`/${SLUG}/book?service=${service.id}&specialist=${master.id}`)
      const steps = bookingSteps(guestPage)
      await expect(steps.datetime.getByRole('group', { name: 'Day' })).toBeVisible()
      await pickFirstFreeSlot(guestPage)
      await steps.contacts.getByLabel('Name').fill('E2E Предоплата')
      await steps.contacts.getByLabel('Phone').fill(randomClientPhone().replace('+996', ''))
      await submitBooking(guestPage)
      await expect(guestPage).toHaveURL(/\/pay\/[0-9a-f-]+\?s=/)
      // The first visit compiles the route in dev: give the checkout a moment.
      await expect(guestPage.getByText('Test mode')).toBeVisible({ timeout: 20_000 })
      await guestPage.getByRole('button', { name: `Pay ${DEPOSIT} som` }).click()
      await expect(guestPage).toHaveURL(/\/bookings/)
      await expect(guestPage.getByText('Deposit paid')).toBeVisible()
      const [stored] = await guestPage.evaluate(
        () =>
          JSON.parse(localStorage.getItem('awaisa:bookings:v2') ?? '[]') as {
            id: string
            token: string
          }[],
      )
      const paid = await (
        await fetch(`${API_URL}/bookings/${stored?.id}`, {
          headers: { 'x-booking-token': stored?.token ?? '' },
        })
      ).json()
      expect(paid.status).toBe('confirmed')
      expect(paid.payment).toMatchObject({ status: 'paid', amount: DEPOSIT })

      // 2. Through the API: an unpaid booking holds its slot until the hold runs out.
      let date = ''
      let time = ''
      for (let offset = 9; offset < 14 && !date; offset += 1) {
        const candidate = new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10)
        const [free] = await slotsOn(candidate)
        if (free) {
          date = candidate
          time = free.time
        }
      }
      expect(date).not.toBe('')
      const held = await (
        await fetch(`${API_URL}/bookings`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            serviceId: service.id,
            specialistId: master.id,
            date,
            time,
            name: 'E2E Предоплата',
            phone: randomClientPhone(),
          }),
        })
      ).json()
      expect(held.checkoutUrl).toMatch(/^\/pay\//)
      expect(held.payment).toMatchObject({ status: 'pending', amount: DEPOSIT })
      expect((await slotsOn(date)).some((slot) => slot.time === time)).toBe(false)

      // The hold «runs out»; the minute cron releases the slot.
      await withDb((client) =>
        client.query(
          `UPDATE "bookings" SET "payment_due_at" = now() - interval '1 minute' WHERE "id" = $1`,
          [held.id],
        ),
      )
      const read = async () =>
        (
          await fetch(`${API_URL}/bookings/${held.id}`, {
            headers: { 'x-booking-token': held.cancelToken },
          })
        ).json()
      await expect
        .poll(async () => (await read()).payment?.status, { timeout: 100_000, intervals: [5_000] })
        .toBe('expired')
      expect((await read()).status).toBe('cancelled')
      expect((await slotsOn(date)).some((slot) => slot.time === time)).toBe(true)
    } finally {
      // A run stopped before this line leaves the test's own deposit behind; taking that as the
      // service's value would keep it there for good (the booking tests then land on /pay).
      await saveService(service.deposit === DEPOSIT ? null : (service.deposit ?? null))
      await guest.close()
    }
  })
})
