import type { AnalyticsReport } from '@/shared/api/types'

type Bucket = { key: string; label: string; title: string; revenue: number; visits: number }

const numberFormatter = new Intl.NumberFormat('ru-RU')
const compactFormatter = new Intl.NumberFormat('ru-RU', {
  notation: 'compact',
  maximumFractionDigits: 1,
})
const dayFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})
const weekdayFormatter = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', timeZone: 'UTC' })
const monthFormatter = new Intl.DateTimeFormat('ru-RU', { month: 'short', timeZone: 'UTC' })
const monthLongFormatter = new Intl.DateTimeFormat('ru-RU', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const toDate = (key: string) => new Date(`${key}T00:00:00Z`)

const formatMoney = (value: number) => `${numberFormatter.format(value)} сом`

// Axis ticks: in full under 10 000, compact above (10 тыс.).
const formatTick = (value: number) =>
  value < 10_000 ? numberFormatter.format(value) : compactFormatter.format(value)

const formatDay = (key: string) => dayFormatter.format(toDate(key))

// A column per day for a week or a month, per week for a quarter, per month for a year:
// never more than ~31 columns, so they stay thin bars instead of a smear.
const toBuckets = (daily: AnalyticsReport['daily'], days: number): Bucket[] => {
  if (days <= 31) {
    return daily.map((day) => ({
      key: day.date,
      label:
        days <= 7
          ? weekdayFormatter.format(toDate(day.date))
          : String(toDate(day.date).getUTCDate()),
      title: formatDay(day.date),
      revenue: day.revenue,
      visits: day.visits,
    }))
  }

  const groups = new Map<string, Bucket>()
  daily.forEach((day, index) => {
    const date = toDate(day.date)
    const key =
      days <= 120 ? `w${Math.floor(index / 7)}` : `${date.getUTCFullYear()}-${date.getUTCMonth()}`
    const bucket = groups.get(key) ?? {
      key,
      label: days <= 120 ? formatDay(day.date) : monthFormatter.format(date),
      title: days <= 120 ? `Неделя с ${formatDay(day.date)}` : monthLongFormatter.format(date),
      revenue: 0,
      visits: 0,
    }
    bucket.revenue += day.revenue
    bucket.visits += day.visits
    groups.set(key, bucket)
  })

  return [...groups.values()]
}

// A clean axis maximum: 1, 2 or 5 × 10ⁿ above the data.
const niceCeiling = (value: number) => {
  if (value <= 0) return 1000
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const step = [1, 2, 2.5, 5, 10].find((factor) => factor * magnitude >= value) ?? 10
  return step * magnitude
}

export type { Bucket }
export { formatDay, formatMoney, formatTick, niceCeiling, numberFormatter, toBuckets }
