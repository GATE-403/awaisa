import type { Catalog } from '@/common/api/types'
import { ANY_SPECIALIST_ID, BOOKING_DAYS_AHEAD } from './bookingConstants'

type BookingDay = {
  key: string
  weekday: string
  dayOfMonth: number
  month: string
  label: string
  isToday: boolean
  isClosed?: boolean
}

const priceFormatter = new Intl.NumberFormat('ru-RU')
const weekdayFormatter = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' })
const monthFormatter = new Intl.DateTimeFormat('ru-RU', { month: 'short' })
const longDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

const CURRENCY = 'сом'

const formatAmount = (price: number) => priceFormatter.format(price)

const formatPrice = (price: number) => `${formatAmount(price)}\u00a0${CURRENCY}`

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} мин`
  if (rest === 0) return `${hours} ч`

  return `${hours} ч ${rest} мин`
}

const toDayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const fromDayKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1)
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

const getDateParts = (key: string) => {
  const date = fromDayKey(key)

  return {
    day: date.getDate(),
    month: monthFormatter.format(date).replace('.', ''),
    weekday: capitalize(new Intl.DateTimeFormat('ru-RU', { weekday: 'long' }).format(date)),
  }
}

const formatDayLong = (key: string) => capitalize(longDateFormatter.format(fromDayKey(key)))

const getUpcomingDays = (todayKey: string, count = BOOKING_DAYS_AHEAD): BookingDay[] => {
  const today = fromDayKey(todayKey)

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + index)

    return {
      key: toDayKey(date),
      weekday: index === 0 ? 'Сегодня' : weekdayFormatter.format(date).replace('.', ''),
      dayOfMonth: date.getDate(),
      month: monthFormatter.format(date).replace('.', ''),
      label: capitalize(longDateFormatter.format(date)),
      isToday: index === 0,
    }
  })
}

const findService = (catalog: Catalog, id: string | null) =>
  catalog.services.find((service) => service.id === id)

const findSpecialist = (catalog: Catalog, id: string | null) =>
  catalog.specialists.find((specialist) => specialist.id === id)

const getSpecialistsForService = (catalog: Catalog, serviceId: string | null) =>
  catalog.specialists.filter(
    (specialist) => serviceId !== null && specialist.serviceIds.includes(serviceId),
  )

const getSpecialistLabel = (catalog: Catalog, id: string | null) =>
  id === ANY_SPECIALIST_ID ? 'Любой мастер' : (findSpecialist(catalog, id)?.name ?? '')

export type { BookingDay }
export {
  CURRENCY,
  findService,
  findSpecialist,
  formatAmount,
  formatDayLong,
  formatDuration,
  formatPrice,
  getDateParts,
  getSpecialistLabel,
  getSpecialistsForService,
  getUpcomingDays,
  toDayKey,
}
