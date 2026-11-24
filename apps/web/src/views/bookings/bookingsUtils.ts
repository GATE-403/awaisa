import { parseClock } from '@/entities/business'
import type { Booking } from '@/shared/api/types'
import type { Translate } from '@/shared/i18n'

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

const getCountdown = (booking: Booking, today: Today | null, t: Translate) => {
  if (!today) return booking.time
  const days = daysBetween(today.dayKey, booking.date)
  // The card shows the time already; the countdown only says which day.
  if (days === 0) return t('Today')
  if (days === 1) return t('Tomorrow')

  return t('In {days}', { days: t.count(days, ['day', 'days']) })
}

export type { Today }
export { getCountdown, isUpcoming }
