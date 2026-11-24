import type { Page, Route } from '@playwright/test'

type BookingPayload = {
  serviceId: string
  specialistId: string
  date: string
  time: string
  name: string
}

const fakeBooking = (input: BookingPayload) => ({
  id: '00000000-0000-4000-8000-000000000001',
  status: 'confirmed',
  serviceId: input.serviceId,
  serviceName: 'Test service',
  price: 1500,
  durationMinutes: 60,
  specialistId: input.specialistId === 'any' ? 'aigerim' : input.specialistId,
  specialistName: 'Айгерим Садыкова',
  date: input.date,
  time: input.time,
  startsAt: `${input.date}T${input.time}:00+06:00`,
  customerName: input.name,
  business: {
    slug: 'awaisa-studio',
    name: 'Awaisa Studio',
    address: 'ул. Токтогула, 125',
    phone: '+996555123456',
    mapUrl: 'https://2gis.kg/bishkek',
  },
  cancelToken: 'test-token',
})

const mockCreateBooking = async (
  page: Page,
  respond: (route: Route, input: BookingPayload) => Promise<void>,
) => {
  const payloads: BookingPayload[] = []

  await page.route('**/api/bookings', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    const input = route.request().postDataJSON() as BookingPayload
    payloads.push(input)
    await respond(route, input)
  })

  return payloads
}

const succeed = (route: Route, input: BookingPayload) =>
  route.fulfill({ status: 201, json: fakeBooking(input) })

const conflict = (route: Route) =>
  route.fulfill({ status: 409, json: { message: 'Someone just took this time, choose another' } })

export type { BookingPayload }
export { conflict, mockCreateBooking, succeed }
