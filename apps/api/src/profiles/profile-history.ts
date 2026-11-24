// A client's history replayed in time: when each achievement was earned and the last year of
// visits by month. Pure and unit-tested; the service feeds it rows from bookings and reviews.

import { toBusinessParts } from '../common/business-time.js'

type HistoryVisit = {
  at: Date
  slug: string
  businessName: string
  serviceName: string
  masterName: string | null
  /** Kinds of service this visit counts for (haircut, nails…). */
  kinds: string[]
  isEarly: boolean
}

type ActivityMonth = {
  /** «2026-11», Bishkek time. */
  month: string
  visits: number
  /** The month's visits, newest first (a few, for the hover); empty when places are private. */
  items: {
    date: string
    slug: string
    businessName: string
    serviceName: string
    masterName: string | null
  }[]
}

const MONTHS = 12
const ITEMS_PER_MONTH = 4
const YEAR_MS = 365 * 86_400_000

const monthKey = (date: Date) => toBusinessParts(date).dateKey.slice(0, 7)

const shiftMonth = (key: string, by: number) => {
  const [year = 0, month = 1] = key.split('-').map(Number)
  const index = year * 12 + (month - 1) + by
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
}

/** The twelve months up to `now`'s, oldest first, each with its visits. */
const activityOf = (visits: HistoryVisit[], now: Date, showsPlaces: boolean): ActivityMonth[] => {
  const last = monthKey(now)
  const months = Array.from({ length: MONTHS }, (_, index) => ({
    month: shiftMonth(last, index - (MONTHS - 1)),
    visits: 0,
    items: [] as ActivityMonth['items'],
  }))
  const byKey = new Map(months.map((month) => [month.month, month]))
  const newestFirst = [...visits].sort((first, second) => second.at.getTime() - first.at.getTime())
  for (const visit of newestFirst) {
    const month = byKey.get(monthKey(visit.at))
    if (!month) continue
    month.visits += 1
    if (showsPlaces && month.items.length < ITEMS_PER_MONTH) {
      month.items.push({
        date: toBusinessParts(visit.at).dateKey,
        slug: visit.slug,
        businessName: visit.businessName,
        serviceName: visit.serviceName,
        masterName: visit.masterName,
      })
    }
  }
  return months
}

/**
 * When each achievement was reached: the moment its count first hit the target, replaying visits
 * and reviews in order. Friends carry no dates (null); «A year with us» is a year after the first visit.
 */
const earnedDatesOf = (
  visits: HistoryVisit[],
  reviewDates: Date[],
  achievements: { id: string; earned: boolean; progress: { target: number } }[],
): Record<string, string | null> => {
  const ordered = [...visits].sort((first, second) => first.at.getTime() - second.at.getTime())
  // Each series lists the moments its count went up by one: its n-th entry is when it reached n.
  const series: Record<string, Date[]> = {
    visits: [],
    regular: [],
    kinds: [],
    places: [],
    early: [],
    reviews: [...reviewDates].sort((first, second) => first.getTime() - second.getTime()),
  }
  const perPlace = new Map<string, number>()
  const kinds = new Set<string>()
  let best = 0
  for (const visit of ordered) {
    series.visits?.push(visit.at)
    const count = (perPlace.get(visit.slug) ?? 0) + 1
    perPlace.set(visit.slug, count)
    if (count > best) {
      best = count
      series.regular?.push(visit.at)
    }
    if (perPlace.get(visit.slug) === 1) series.places?.push(visit.at)
    for (const kind of visit.kinds) {
      if (kinds.has(kind)) continue
      kinds.add(kind)
      series.kinds?.push(visit.at)
    }
    if (visit.isEarly) series.early?.push(visit.at)
  }
  const metricOf: Record<string, string> = {
    'first-visit': 'visits',
    'visits-10': 'visits',
    'visits-25': 'visits',
    regular: 'regular',
    explorer: 'kinds',
    'places-5': 'places',
    'early-bird': 'early',
    'first-review': 'reviews',
    critic: 'reviews',
  }
  const first = ordered[0]
  return Object.fromEntries(
    achievements.map((achievement) => {
      if (!achievement.earned) return [achievement.id, null]
      if (achievement.id === 'year') {
        return [achievement.id, first ? new Date(first.at.getTime() + YEAR_MS).toISOString() : null]
      }
      const metric = metricOf[achievement.id]
      const date = metric ? series[metric]?.[achievement.progress.target - 1] : undefined
      return [achievement.id, date ? date.toISOString() : null]
    }),
  )
}

export type { ActivityMonth, HistoryVisit }
export { activityOf, earnedDatesOf }
