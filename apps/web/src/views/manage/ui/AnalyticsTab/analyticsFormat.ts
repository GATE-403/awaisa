import type { AnalyticsReport } from '@/shared/api/types'
import type { Translate } from '@/shared/i18n'

type Bucket = { key: string; label: string; title: string; revenue: number; visits: number }

const LOCALES: Record<Translate['language'], string> = { ru: 'ru-RU', ky: 'ky-KG', en: 'en-GB' }

const numberFormatter = new Intl.NumberFormat('ru-RU')
const compactFormatter = new Intl.NumberFormat('ru-RU', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const toDate = (key: string) => new Date(`${key}T00:00:00Z`)

const dateFormat = (t: Translate, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(LOCALES[t.language], { ...options, timeZone: 'UTC' })

// Axis ticks: in full under 10 000, compact above (10 тыс.).
const formatTick = (value: number) =>
  value < 10_000 ? numberFormatter.format(value) : compactFormatter.format(value)

// Browsers ship few Kyrgyz date names, so Kyrgyz days are built from `t`'s own month names.
const analyticsFormat = (t: Translate) => {
  const dayFormatter = dateFormat(t, { day: 'numeric', month: 'short' })
  const monthLongFormatter = dateFormat(t, { month: 'long', year: 'numeric' })

  const formatMoney = (value: number) =>
    t('{amount} сом', { amount: numberFormatter.format(value) })

  const formatDay = (key: string) =>
    t.language === 'ky'
      ? `${toDate(key).getUTCDate()}-${t.monthShort(key)}`
      : dayFormatter.format(toDate(key))

  const formatMonth = (key: string) =>
    t.language === 'ky'
      ? `${toDate(key).getUTCFullYear()}, ${t.monthShort(key)}`
      : monthLongFormatter.format(toDate(key))

  // A column per day for a week or a month, per week for a quarter, per month for a year:
  // never more than ~31 columns, so they stay thin bars instead of a smear.
  const toBuckets = (daily: AnalyticsReport['daily'], days: number): Bucket[] => {
    if (days <= 31) {
      return daily.map((day) => ({
        key: day.date,
        label: days <= 7 ? t.weekdayShort(day.date) : String(toDate(day.date).getUTCDate()),
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
        label: days <= 120 ? formatDay(day.date) : t.monthShort(day.date),
        title:
          days <= 120 ? t('Неделя с {day}', { day: formatDay(day.date) }) : formatMonth(day.date),
        revenue: 0,
        visits: 0,
      }
      bucket.revenue += day.revenue
      bucket.visits += day.visits
      groups.set(key, bucket)
    })

    return [...groups.values()]
  }

  return { formatDay, formatMoney, toBuckets }
}

// A clean axis maximum: 1, 2 or 5 × 10ⁿ above the data.
const niceCeiling = (value: number) => {
  if (value <= 0) return 1000
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const step = [1, 2, 2.5, 5, 10].find((factor) => factor * magnitude >= value) ?? 10
  return step * magnitude
}

export type { Bucket }
export { analyticsFormat, formatTick, niceCeiling, numberFormatter }
