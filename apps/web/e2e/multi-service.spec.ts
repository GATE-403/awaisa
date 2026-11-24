import { expect, type Page, test } from '@playwright/test'
import { randomClientPhone } from './account'
import { bishkekDay, createOwnBusiness, type OwnBusiness } from './business'
import { API_URL, bookingSteps, editStep, pickFirstFreeSlot, submitBooking } from './helpers'

// One visit of several services by one master: manicure and pedicure in one booking.
const setUpNails = async (page: Page) => {
  const business = await createOwnBusiness(page, {
    services: [
      { name: 'Manicure', durationMinutes: 60, price: 1200 },
      { name: 'Pedicure', durationMinutes: 90, price: 1500 },
      { name: 'Brows', durationMinutes: 30, price: 800 },
    ],
    masters: ['Aida', 'Bermet'],
  })
  const byName = (name: string) => {
    const found = business.services.find((service) => service.name === name)
    if (!found) throw new Error(`${name} expected`)
    return found
  }
  const [aida, bermet] = business.masters
  if (!aida || !bermet) throw new Error('Two masters expected')
  // Bermet does no pedicure: a visit of manicure and pedicure is Aida's alone.
  const updated = await page.request.put(`/api/manage/${business.slug}/specialists/${bermet.id}`, {
    data: {
      name: bermet.name,
      role: 'Specialist',
      serviceIds: [byName('Manicure').id, byName('Brows').id],
    },
  })
  expect(updated.ok()).toBe(true)
  return {
    business,
    manicure: byName('Manicure'),
    pedicure: byName('Pedicure'),
    aida,
    bermet,
  }
}

const firstFreeTime = async (query: string) => {
  for (let offset = 1; offset <= 7; offset += 1) {
    const date = bishkekDay(offset)
    const answer = await (await fetch(`${API_URL}/availability?${query}&date=${date}`)).json()
    const slot = (answer.slots as { time: string; isAvailable: boolean }[]).find(
      (item) => item.isAvailable,
    )
    if (slot) return { date, time: slot.time }
  }
  throw new Error('No free time for the visit')
}

const scheduleOf = async (page: Page, business: OwnBusiness, date: string) =>
  (await (await page.request.get(`/api/manage/${business.slug}/schedule?date=${date}`)).json()) as {
    bookings: { id: string; serviceName: string; price: number; durationMinutes: number }[]
  }

test.describe('A visit of several services', () => {
  test('a client adds pedicure to a manicure and books both as one visit; the owner sees one block', async ({
    page,
    browser,
  }) => {
    test.setTimeout(90_000)
    const { business } = await setUpNails(page)

    const guestContext = await browser.newContext()
    const guest = await guestContext.newPage()
    try {
      await guest.goto(`/${business.slug}/book`)
      const steps = bookingSteps(guest)
      await steps.service.getByRole('radio', { name: /^Manicure/ }).click()

      // The visit can grow in passing: one service is offered under its ticket, a tap adds it.
      await guest.getByRole('button', { name: /^\+ Pedicure/ }).click()
      // Once per visit: nothing more is offered after it (Brows could still join, Aida aside).
      // The ticket keeps the first service's name and marks the added one under it.
      await expect(steps.service).toContainText('+ Pedicure')
      await expect(guest.getByRole('button', { name: /^\+ / })).toHaveCount(0)

      // Only Aida does both, so the master is chosen; the card says the whole visit.
      await expect(steps.service).toContainText('Manicure')
      await expect(steps.service).toContainText('+ Pedicure')
      await expect(steps.service).toContainText('2 h 30 min')
      await expect(steps.specialist).toContainText('Aida')
      const time = await pickFirstFreeSlot(guest)

      await steps.contacts.getByLabel('Name').fill('E2E Two services')
      await steps.contacts.getByLabel('Phone').fill(randomClientPhone().replace('+996', ''))
      await submitBooking(guest)
      await expect(guest.getByRole('heading', { name: 'You are booked' })).toBeVisible()

      const stored = await guest.evaluate(() =>
        JSON.parse(window.localStorage.getItem('awaisa:bookings:v2') ?? '[]'),
      )
      const booking = stored[0]?.snapshot
      expect(booking).toMatchObject({
        serviceName: 'Manicure + Pedicure',
        price: 2700,
        durationMinutes: 150,
        time,
      })

      // The owner's day: one block of 2 h 30 min carrying both services.
      const day = await scheduleOf(page, business, booking.date)
      const visits = day.bookings.filter((item) => item.id === booking.id)
      expect(visits).toEqual([
        expect.objectContaining({
          serviceName: 'Manicure + Pedicure',
          price: 2700,
          durationMinutes: 150,
        }),
      ])
      await page.goto(`/manage/${business.slug}?tab=schedule&date=${booking.date}`)
      await expect(
        page.locator('[data-schedule-board]').getByText('Manicure + Pedicure'),
      ).toHaveCount(1)
    } finally {
      await guestContext.close()
    }
  })

  test('adding a service keeps a time the longer visit still fits, and says so when it does not', async ({
    page,
    browser,
  }) => {
    test.setTimeout(90_000)
    const { business, manicure, aida } = await setUpNails(page)
    const date = bishkekDay(1)
    const guestContext = await browser.newContext()
    const guest = await guestContext.newPage()
    try {
      const steps = bookingSteps(guest)
      const offer = guest.getByRole('button', { name: /^\+ Pedicure/ })

      // 10:00 has the morning free after it: the visit grows to 2 h 30 min and keeps its time.
      await guest.goto(
        `/${business.slug}/book?service=${manicure.id}&specialist=${aida.id}&date=${date}&time=10:00`,
      )
      await offer.click()
      await expect(steps.service).toContainText('+ Pedicure')
      await expect(steps.datetime).toContainText(/10:00.12:30/)
      await expect(guest.getByText(/visit no longer fits/)).toHaveCount(0)

      // «Change» on the service opens the visit's own list: several can be ticked, the added
      // one is ticked too, and Brows can join (Aida does all three).
      await editStep(guest, 'service')
      const visit = steps.service.getByRole('group', { name: 'Services of the visit' })
      await expect(visit.getByRole('checkbox', { name: /^Manicure/ })).toBeChecked()
      const pedicure = visit.getByRole('checkbox', { name: /^Pedicure/ })
      await expect(pedicure).toBeChecked()
      const brows = visit.getByRole('checkbox', { name: /^Brows/ })
      await expect(brows).not.toBeChecked()
      // A third one is ticked the same way, and the list stays open for more until «Done».
      await brows.click()
      await expect(brows).toBeChecked()
      await pedicure.click()
      await expect(pedicure).not.toBeChecked()
      await guest.getByRole('button', { name: 'Done' }).filter({ visible: true }).click()
      // Manicure and brows: 1 h 30 min from the same 10:00, which still fits.
      await expect(steps.service).toContainText('+ Brows')
      await expect(steps.service).not.toContainText('+ Pedicure')
      await expect(steps.datetime).toContainText(/10:00.11:30/)

      // 19:00 is the last hour before closing at 20:00: the time goes, and the form says why.
      await guest.goto(
        `/${business.slug}/book?service=${manicure.id}&specialist=${aida.id}&date=${date}&time=19:00`,
      )
      await offer.click()
      await expect(
        guest.getByText('The visit no longer fits at 19:00, choose a time'),
      ).toBeVisible()
      await expect(guest.getByRole('heading', { name: 'When suits you?' })).toBeVisible()
    } finally {
      await guestContext.close()
    }
  })

  test('another master is another booking: “Another booking” opens the same place after the visit', async ({
    page,
    browser,
  }) => {
    test.setTimeout(90_000)
    const { business, manicure, aida } = await setUpNails(page)
    const date = bishkekDay(1)
    const guestContext = await browser.newContext()
    const guest = await guestContext.newPage()
    try {
      const steps = bookingSteps(guest)
      await guest.goto(
        `/${business.slug}/book?service=${manicure.id}&specialist=${aida.id}&date=${date}&time=10:00`,
      )
      await steps.contacts.getByLabel('Name').fill('E2E Another booking')
      await steps.contacts.getByLabel('Phone').fill(randomClientPhone().replace('+996', ''))
      await submitBooking(guest)
      await expect(guest.getByRole('heading', { name: 'You are booked' })).toBeVisible()

      // One quiet row: the same place, after the manicure ends at 11:00.
      await guest.getByRole('button', { name: /^Another booking at .+ · after 11:00/ }).click()
      await expect(guest).toHaveURL(new RegExp(`date=${date}.*after=11%3A00|after=11:00`))
      await expect(steps.service.getByRole('radio', { name: /^Brows/ })).toBeVisible()
      await steps.service.getByRole('radio', { name: /^Brows/ }).click()
      await steps.specialist.getByRole('radio', { name: /Bermet/ }).click()
      // The ruler offers nothing before the first visit ends; the action names the time it takes.
      const action = guest
        .getByRole('button', { name: /^Choose \d{2}:\d{2}$/ })
        .filter({ visible: true })
      await expect(action).toBeVisible()
      const offered = ((await action.textContent()) ?? '').replace('Choose ', '')
      expect(offered >= '11:00').toBe(true)
      await action.click()
      // The name and number are already known: the form is ready to book.
      await expect(steps.contacts.getByLabel('Name')).toHaveValue('E2E Another booking')
    } finally {
      await guestContext.close()
    }
  })

  test('the API keeps one master for every service and counts the whole visit', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'API only')
    const { manicure, pedicure, aida, bermet } = await setUpNails(page)
    const visit = `serviceId=${manicure.id}&extraServiceIds=${pedicure.id}`

    // Bermet does no pedicure; «any master» is Aida.
    const refused = await fetch(
      `${API_URL}/availability?${visit}&specialistId=${bermet.id}&date=${bishkekDay(1)}`,
    )
    expect(refused.status).toBe(400)
    expect((await refused.json()).message).toBe(
      "This specialist doesn't do all the chosen services",
    )
    const { date, time } = await firstFreeTime(`${visit}&specialistId=any`)

    const quote = await (
      await fetch(`${API_URL}/promotions/quote?${visit}&date=${date}&time=${time}`)
    ).json()
    expect(quote).toMatchObject({ price: 2700, total: 2700 })

    const created = await fetch(`${API_URL}/bookings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        serviceId: manicure.id,
        extraServiceIds: [pedicure.id],
        specialistId: 'any',
        date,
        time,
        name: 'E2E Two services',
        phone: randomClientPhone(),
        smsConfirmation: false,
      }),
    })
    expect(created.status).toBe(201)
    const booking = await created.json()
    expect(booking).toMatchObject({
      specialistId: aida.id,
      serviceName: 'Manicure + Pedicure',
      price: 2700,
      durationMinutes: 150,
      services: [
        expect.objectContaining({ id: manicure.id, price: 1200 }),
        expect.objectContaining({ id: pedicure.id, price: 1500 }),
      ],
    })
    expect(new Date(booking.endsAt).getTime() - new Date(booking.startsAt).getTime()).toBe(
      150 * 60_000,
    )

    // The same service twice, or one of another place, is refused.
    const twice = await fetch(`${API_URL}/bookings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        serviceId: manicure.id,
        extraServiceIds: [manicure.id],
        specialistId: 'any',
        date,
        time,
        name: 'E2E Two services',
        phone: randomClientPhone(),
      }),
    })
    expect(twice.status).toBe(400)
  })
})
