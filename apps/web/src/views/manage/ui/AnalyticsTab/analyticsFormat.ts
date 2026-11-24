import { msg, ph } from '@lingui/core/macro'
import type { AnalyticsReport } from '@/shared/api/types'
import type { Format, Translate } from '@/shared/i18n'

type Bucket = { key: string; label: string; title: string; revenue: number; visits: number }

const COMPACT_OPTIONS: Intl.NumberFormatOptions = { notation: 'compact', maximumFractionDigits: 1 }

const toDate = (key: string) => new Date(`${key}T00:00:00Z`)

const analyticsFormat = (t: Translate, format: Format) => {
  const formatMoney = (value: number) => format.price(value)

  const formatNumber = (value: number) => format.number(value)

  // Axis ticks: in full under 10,000, compact above (10k).
  const formatTick = (value: number) =>
    value < 10_000 ? format.number(value) : format.number(value, COMPACT_OPTIONS)

  // Day keys are dates, not moments: read on UTC so no zone moves them.
  const formatDay = (key: string) =>
    format.date(toDate(key), { day: 'numeric', month: 'short', timeZone: 'UTC' })

  const formatMonth = (key: string) =>
    format.date(toDate(key), { month: 'long', year: 'numeric', timeZone: 'UTC' })

  // A column per day for a week or a month, per week for a quarter, per month for a year:
  // never more than ~31 columns, so they stay thin bars instead of a smear.
  const toBuckets = (daily: AnalyticsReport['daily'], days: number): Bucket[] => {
    if (days <= 31) {
      return daily.map((day) => ({
        key: day.date,
        label: days <= 7 ? format.weekdayShort(day.date) : String(toDate(day.date).getUTCDate()),
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
        label: days <= 120 ? formatDay(day.date) : format.monthShort(day.date),
        title:
          days <= 120
            ? t(msg`Week from ${ph({ day: formatDay(day.date) })}`)
            : formatMonth(day.date),
        revenue: 0,
        visits: 0,
      }
      bucket.revenue += day.revenue
      bucket.visits += day.visits
      groups.set(key, bucket)
    })

    return [...groups.values()]
  }

  return { formatDay, formatMoney, formatNumber, formatTick, toBuckets }
}

export type { Bucket }
export { analyticsFormat }
