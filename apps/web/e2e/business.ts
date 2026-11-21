import { type Page, test } from '@playwright/test'
import { randomClientPhone, signInViaApi } from './account'
import { API_URL } from './helpers'
import { withDb } from './visits'

type OwnService = { id: string; name: string; price: number; durationMinutes: number }
type OwnMaster = { id: string; name: string; serviceIds: string[] }

type OwnBusiness = {
  slug: string
  name: string
  ownerPhone: string
  services: OwnService[]
  masters: OwnMaster[]
  /** The first service and master, for tests that need just one of each. */
  service: OwnService
  master: OwnMaster
}

type OwnBusinessOptions = {
  /** The owner: a fresh number by default, so the business is the only one they have. */
  ownerPhone?: string
  services?: { name: string; durationMinutes: number; price: number }[]
  masters?: string[]
  kind?: string
}

const DEFAULT_SERVICES = [{ name: 'Стрижка', durationMinutes: 60, price: 1000 }]

/**
 * A business of the test's own («E2E …», deleted by the global teardown): its owner signs in on
 * `page`, it gets the services and masters asked for, every master doing every service. Shared
 * seed data stays untouched, and whatever the test counts is only what it made.
 */
const createOwnBusiness = async (
  page: Page,
  {
    ownerPhone = randomClientPhone(),
    services = DEFAULT_SERVICES,
    masters = ['Азамат'],
    kind = 'other',
  }: OwnBusinessOptions = {},
): Promise<OwnBusiness> => {
  await signInViaApi(page, ownerPhone, 'E2E Владелец')
  const suffix = Math.random().toString(36).slice(2, 8)
  const name = `E2E Место ${suffix}`
  const slug = `e2e-place-${suffix}`
  const created = await page.request.post('/api/businesses', {
    data: { name, slug, kind, address: 'ул. Киевская, 1', services },
  })
  if (!created.ok()) throw new Error(`Business failed: ${created.status()} ${await created.text()}`)

  const managed = await (await page.request.get(`/api/manage/${slug}`)).json()
  const ownServices: OwnService[] = managed.catalog.services.map((service: OwnService) => ({
    id: service.id,
    name: service.name,
    price: service.price,
    durationMinutes: service.durationMinutes,
  }))
  const serviceIds = ownServices.map((service) => service.id)
  const ownMasters: OwnMaster[] = []
  for (const masterName of masters) {
    const response = await page.request.post(`/api/manage/${slug}/specialists`, {
      data: { name: masterName, role: 'Мастер', serviceIds },
    })
    if (!response.ok())
      throw new Error(`Master failed: ${response.status()} ${await response.text()}`)
    const master = await response.json()
    ownMasters.push({ id: master.id, name: masterName, serviceIds })
  }

  const [service] = ownServices
  const [master] = ownMasters
  if (!service || !master) throw new Error('A business needs a service and a master')

  return { slug, name, ownerPhone, services: ownServices, masters: ownMasters, service, master }
}

const bishkekDay = (offsetDays = 0) =>
  new Date(Date.now() + offsetDays * 86_400_000 + 6 * 3_600_000).toISOString().slice(0, 10)

const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)

type VisitOptions = {
  slug: string
  serviceId: string
  specialistId: string
  name?: string
  phone?: string
  /** Moves the booking to this many days ago (same time of day); left ahead when undefined. */
  daysBack?: number
  /** The first free slot on or after this many days from today. */
  fromDay?: number
  smsConfirmation?: boolean
}

type Visit = { id: string; token: string; date: string; time: string; phone: string; name: string }

/**
 * `POST /bookings` is limited per IP per minute (the e2e API allows 100), and every request of a
 * run comes from localhost; the counter lives in Redis, so dev servers on the same machine add to
 * it. Over the limit the helper waits as long as the API says and extends the test's timeout by
 * that wait: the limit guards the API, it is not what these tests check.
 */
const postBooking = async (body: Record<string, unknown>) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${API_URL}/bookings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (response.status !== 429) return response
    const header = [...response.headers.entries()].find(([key]) => key.startsWith('retry-after'))
    const waitMs = (Number(header?.[1]) || 10) * 1000 + 500
    test.info().setTimeout(test.info().timeout + waitMs)
    await new Promise((resolve) => setTimeout(resolve, waitMs))
  }
  throw new Error('Booking failed: still rate limited after waiting')
}

/**
 * A real booking through the public API at the first free time, optionally moved into the past
 * as if the visit had happened. In a business of the test's own nothing else can sit there.
 */
const createVisit = async ({
  slug,
  serviceId,
  specialistId,
  name = 'E2E Клиент',
  phone = randomClientPhone(),
  daysBack,
  fromDay = 1,
  smsConfirmation = false,
}: VisitOptions): Promise<Visit> => {
  const target = daysBack === undefined ? null : bishkekDay(-daysBack)
  for (let offset = fromDay; offset <= fromDay + 14; offset += 1) {
    const date = bishkekDay(offset)
    const availability = await (
      await fetch(
        `${API_URL}/availability?serviceId=${serviceId}&specialistId=${specialistId}&date=${date}`,
      )
    ).json()
    const slots: { time: string; isAvailable: boolean }[] = availability.slots ?? []
    for (const slot of slots.filter((item) => item.isAvailable)) {
      const response = await postBooking({
        serviceId,
        specialistId,
        date,
        time: slot.time,
        name,
        phone,
        smsConfirmation,
      })
      if (!response.ok) {
        throw new Error(`Booking failed: ${response.status} ${await response.text()}`)
      }
      const booking = await response.json()
      const visit = { id: booking.id, token: booking.cancelToken, time: slot.time, phone, name }
      if (!target) return { ...visit, date }

      // An earlier visit of this test may already sit at that hour of the target day: then this
      // booking is dropped and the next free time tried.
      const isMoved = await withDb(async (client) => {
        try {
          await client.query(
            `UPDATE "bookings" SET "starts_at" = "starts_at" - make_interval(days => $2),
               "ends_at" = "ends_at" - make_interval(days => $2) WHERE "id" = $1`,
            [booking.id, daysBetween(target, date)],
          )
          return true
        } catch (error) {
          if ((error as { code?: string }).code !== '23P01') throw error
          await client.query('DELETE FROM "bookings" WHERE "id" = $1', [booking.id])
          return false
        }
      })
      if (isMoved) return { ...visit, date: target }
    }
  }
  throw new Error(`No free slot in ${slug}`)
}

export type { OwnBusiness, Visit }
export { bishkekDay, createOwnBusiness, createVisit }
