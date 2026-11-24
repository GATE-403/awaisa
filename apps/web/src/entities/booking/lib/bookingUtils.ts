import { msg } from '@lingui/core/macro'
import { ANY_SPECIALIST_ID, BOOKING_DAYS_AHEAD } from '@/entities/booking/config/bookingConstants'
import type { Catalog } from '@/shared/api/types'
import type { Translate } from '@/shared/i18n'

// Words for a day (weekday, month) come from `useFormat()` in the page's language.
type BookingDay = {
  key: string
  dayOfMonth: number
  isToday: boolean
  isClosed?: boolean
}

const toDayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const fromDayKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1)
}

const addDayKey = (key: string, days: number) => {
  const date = fromDayKey(key)
  return toDayKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days))
}

const getDateParts = (key: string) => ({ day: fromDayKey(key).getDate() })

// Days from `before` days ago to `after - 1` days ahead; the schedule needs the past to close visits.
const getDaysAround = (todayKey: string, before: number, after: number): BookingDay[] => {
  const today = fromDayKey(todayKey)

  return Array.from({ length: before + after }, (_, index) => {
    const offset = index - before
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset)

    return {
      key: toDayKey(date),
      dayOfMonth: date.getDate(),
      isToday: offset === 0,
    }
  })
}

const getUpcomingDays = (todayKey: string, count = BOOKING_DAYS_AHEAD): BookingDay[] =>
  getDaysAround(todayKey, 0, count)

const findService = (catalog: Catalog, id: string | null) =>
  catalog.services.find((service) => service.id === id)

const findSpecialist = (catalog: Catalog, id: string | null) =>
  catalog.specialists.find((specialist) => specialist.id === id)

const getSpecialistsForService = (catalog: Catalog, serviceId: string | null) =>
  catalog.specialists.filter(
    (specialist) => serviceId !== null && specialist.serviceIds.includes(serviceId),
  )

const getSpecialistLabel = (catalog: Catalog, id: string | null, t: Translate) =>
  id === ANY_SPECIALIST_ID ? t(msg`Any specialist`) : (findSpecialist(catalog, id)?.name ?? '')

export type { BookingDay }
export {
  addDayKey,
  findService,
  findSpecialist,
  getDateParts,
  getSpecialistLabel,
  getSpecialistsForService,
  getDaysAround,
  getUpcomingDays,
  toDayKey,
}
