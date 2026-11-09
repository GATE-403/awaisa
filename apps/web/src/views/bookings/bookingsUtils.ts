import { parseClock } from '@/entities/business'
import type { Booking } from '@/shared/api/types'
import { pluralize } from '@/shared/lib/plural'

type Today = { dayKey: string; minutes: number }

const DAY_MS = 24 * 60 * 60 * 1000

const daysBetween = (fromKey: string, toKey: string) =>
  Math.round((Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) / DAY_MS)

const isUpcoming = (booking: Booking, today: Today | null) => {
  if (booking.status !== 'confirmed') return false
  if (!today) return true
  if (booking.date !== today.dayKey) return booking.date > today.dayKey

  return parseClock(booking.time) + booking.durationMinutes > today.minutes
}

const getCountdown = (booking: Booking, today: Today | null) => {
  if (!today) return booking.time
  const days = daysBetween(today.dayKey, booking.date)
  if (days === 0) return `Сегодня в ${booking.time}`
  if (days === 1) return `Завтра в ${booking.time}`

  return `Через ${pluralize(days, ['день', 'дня', 'дней'])}`
}

export type { Today }
export { getCountdown, isUpcoming }
