import type { BusinessAttention, BusinessLink } from '@/shared/api/types'
import type { Translate } from '@/shared/i18n'
import { pluralize } from '@/shared/lib/plural'
import { isArray, onlyStrings, readJson, writeJson } from '@/shared/lib/storage'

// "My businesses": what waits in a business, the order of the list and its search (pure,
// unit-tested in `tests/businessList.test.ts`).

type AttentionItem = {
  key: 'unmarkedVisits' | 'unansweredReviews' | 'failedReceipts'
  text: string
  tab: string
}

const RECENT_KEY = 'awaisa:cabinet-recent:v1'
const RECENT_LIMIT = 20

/** One short line per thing that waits, most urgent first; nothing for zero. */
const attentionItems = (attention: BusinessAttention | undefined, t?: Translate) => {
  if (!attention) return []
  const count = (value: number, forms: [string, string]) =>
    t ? t.count(value, forms) : pluralize(value, forms)
  const items: AttentionItem[] = []
  if (attention.unmarkedVisits > 0) {
    items.push({
      key: 'unmarkedVisits',
      text: `${count(attention.unmarkedVisits, ['visit', 'visits'])} ${t ? t('unmarked') : 'unmarked'}`,
      tab: 'schedule',
    })
  }
  if (attention.unansweredReviews > 0) {
    items.push({
      key: 'unansweredReviews',
      text: `${count(attention.unansweredReviews, ['review', 'reviews'])} ${t ? t('unanswered') : 'unanswered'}`,
      tab: 'reviews',
    })
  }
  if (attention.failedReceipts > 0) {
    items.push({
      key: 'failedReceipts',
      text: `${count(attention.failedReceipts, ['receipt', 'receipts'])} failed`,
      tab: 'fiscal',
    })
  }
  return items
}

const attentionTotal = (attention: BusinessAttention | undefined) =>
  attention ? attention.unmarkedVisits + attention.unansweredReviews + attention.failedReceipts : 0

/**
 * Businesses that wait for something first (most first), then the ones opened lately on this
 * device, then the rest in the API's order (oldest first). The sort is stable.
 */
const sortBusinesses = (
  businesses: BusinessLink[],
  attention: Map<string, BusinessAttention>,
  recent: string[],
) => {
  const rank = (slug: string) => {
    const index = recent.indexOf(slug)
    return index === -1 ? recent.length : index
  }
  return businesses
    .map((business, index) => ({ business, index }))
    .sort((a, b) => {
      const waiting =
        Number(attentionTotal(attention.get(b.business.slug)) > 0) -
        Number(attentionTotal(attention.get(a.business.slug)) > 0)
      if (waiting !== 0) return waiting
      const recency = rank(a.business.slug) - rank(b.business.slug)
      return recency !== 0 ? recency : a.index - b.index
    })
    .map(({ business }) => business)
}

const normalize = (text: string) => text.toLowerCase().replaceAll('ё', 'е').trim()

/** By name or address, any part of it ("barb" finds "Kings Barbershop" only by its name). */
const filterBusinesses = (businesses: BusinessLink[], query: string) => {
  const needle = normalize(query)
  if (!needle) return businesses
  return businesses.filter(
    (business) => normalize(business.name).includes(needle) || business.slug.includes(needle),
  )
}

/** A platform admin's own businesses, apart from every other one they can open. */
const isOwnBusiness = (business: BusinessLink) => business.role !== 'admin'

const readRecent = (): string[] => onlyStrings(readJson(RECENT_KEY, isArray))

const rememberOpened = (slug: string) => {
  const next = [slug, ...readRecent().filter((item) => item !== slug)].slice(0, RECENT_LIMIT)
  writeJson(RECENT_KEY, next)
}

type TodaySummary = {
  visits: number
  /** Som, null when no business here shows money to this person (administrators). */
  revenue: number | null
  /** The soonest visit still ahead today, over every business. */
  next: { time: string; name: string } | null
}

/** "Today 23 visits · 31,200 som · next at 14:30, Boroda" over every business. */
const todaySummary = (
  businesses: BusinessLink[],
  attention: Map<string, BusinessAttention>,
  todayKey: string,
): TodaySummary => {
  const revenues = businesses
    .map((business) => attention.get(business.slug)?.todayRevenue)
    .filter((value): value is number => typeof value === 'number')
  const next = businesses
    .filter((business) => business.next?.date === todayKey)
    .sort((a, b) => (a.next?.time ?? '').localeCompare(b.next?.time ?? ''))[0]
  return {
    visits: businesses.reduce((sum, business) => sum + business.todayCount, 0),
    revenue: revenues.length > 0 ? revenues.reduce((sum, value) => sum + value, 0) : null,
    next: next?.next ? { time: next.next.time, name: next.name } : null,
  }
}

/** What a quiet row says about where its business stands (one line, nothing louder). */
type StatusLine =
  | { kind: 'setup'; done: number; total: number; text: string; tab: string }
  | { kind: 'week'; views: number; bookings: number; trend: 'up' | 'down' | null }
  | { kind: 'share' }

const SETUP_TEXTS: Record<'services' | 'masters' | 'hours', string> = {
  services: 'Add services',
  masters: 'Add specialists',
  hours: 'Check the opening hours',
}

/**
 * The row's own line when nothing is booked ahead and nothing waits: the step left before clients
 * can book, else the week in figures with its direction, else a nudge to share the page.
 * A business still being set up says so even when it has visits (it cannot take online ones).
 */
const statusLine = (
  attention: BusinessAttention | undefined,
  isQuiet: boolean,
  t?: Translate,
  isPublished = true,
): StatusLine | null => {
  if (!attention) return null
  const { setup, week } = attention
  if (setup.next) {
    const step = SETUP_TEXTS[setup.next]
    return {
      kind: 'setup',
      done: setup.done,
      total: setup.total,
      text: t ? t(step) : step,
      tab: setup.next,
    }
  }
  if (!isQuiet) return null
  // A hidden page has nothing to share: its "Hidden" beside the name says enough.
  if (week.views + week.bookings === 0) return isPublished ? { kind: 'share' } : null
  const [now, before] =
    week.bookings + week.previousBookings > 0
      ? [week.bookings, week.previousBookings]
      : [week.views, week.previousViews]
  return {
    kind: 'week',
    views: week.views,
    bookings: week.bookings,
    trend: now > before ? 'up' : now < before ? 'down' : null,
  }
}

/** "This week 14 bookings · 230 views" on a quiet day, over every business in view. */
const weekSummary = (businesses: BusinessLink[], attention: Map<string, BusinessAttention>) =>
  businesses.reduce(
    (sum, business) => {
      const week = attention.get(business.slug)?.week
      return week ? { views: sum.views + week.views, bookings: sum.bookings + week.bookings } : sum
    },
    { views: 0, bookings: 0 },
  )

export type { AttentionItem, StatusLine, TodaySummary }
export {
  attentionItems,
  attentionTotal,
  filterBusinesses,
  isOwnBusiness,
  readRecent,
  rememberOpened,
  sortBusinesses,
  statusLine,
  todaySummary,
  weekSummary,
}
