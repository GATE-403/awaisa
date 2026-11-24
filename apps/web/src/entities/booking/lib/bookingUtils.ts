import { ANY_SPECIALIST_ID, BOOKING_DAYS_AHEAD } from '@/entities/booking/config/bookingConstants'
import type { Catalog } from '@/shared/api/types'
import { REGION } from '@/shared/config/region'

type BookingDay = {
  key: string
  weekday: string
  dayOfMonth: number
  month: string
  label: string
  isToday: boolean
  isClosed?: boolean
}

const priceFormatter = new Intl.NumberFormat(REGION.locale.numbers)
const weekdayFormatter = new Intl.DateTimeFormat('en-GB', { weekday: 'short' })
const monthFormatter = new Intl.DateTimeFormat('en-GB', { month: 'short' })
const longDateFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

const CURRENCY = REGION.currency.label

const formatAmount = (price: number) => priceFormatter.format(price)

const formatPrice = (price: number) => `${formatAmount(price)}\u00a0${CURRENCY}`

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

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

const getDateParts = (key: string) => {
  const date = fromDayKey(key)

  return {
    day: date.getDate(),
    month: monthFormatter.format(date).replace('.', ''),
    weekday: capitalize(new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(date)),
  }
}

const formatDayLong = (key: string) => capitalize(longDateFormatter.format(fromDayKey(key)))

// Days from `before` days ago to `after - 1` days ahead; the schedule needs the past to close visits.
const getDaysAround = (todayKey: string, before: number, after: number): BookingDay[] => {
  const today = fromDayKey(todayKey)

  return Array.from({ length: before + after }, (_, index) => {
    const offset = index - before
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset)

    return {
      key: toDayKey(date),
      weekday: weekdayFormatter.format(date).replace('.', ''),
      dayOfMonth: date.getDate(),
      month: monthFormatter.format(date).replace('.', ''),
      label: `${offset === 0 ? 'Today, ' : ''}${longDateFormatter.format(date)}`,
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

const getSpecialistLabel = (catalog: Catalog, id: string | null) =>
  id === ANY_SPECIALIST_ID ? 'Any specialist' : (findSpecialist(catalog, id)?.name ?? '')

export type { BookingDay }
export {
  addDayKey,
  CURRENCY,
  findService,
  findSpecialist,
  formatAmount,
  formatDayLong,
  formatPrice,
  getDateParts,
  getSpecialistLabel,
  getSpecialistsForService,
  getDaysAround,
  getUpcomingDays,
  toDayKey,
}
