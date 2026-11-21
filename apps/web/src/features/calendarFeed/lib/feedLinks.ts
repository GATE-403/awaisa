// Where a feed's secret address goes: the system calendar (webcal), Google Calendar, and this
// device's memory: the API keeps only the address's hash, so it cannot show it again.

const KEY = 'awaisa:calendar-feeds:v1'

/** Which feed: a master's own day or a member's view of the business. */
type FeedScope = { kind: 'master' | 'business'; slug: string }

type SavedFeed = { url: string; createdAt: string }

/** `webcal://` makes iOS, macOS and Android calendar apps offer «Подписаться». */
const toWebcal = (url: string) => url.replace(/^https?:\/\//, 'webcal://')

/** Google Calendar's «Add by URL», already filled in. */
const toGoogleCalendar = (url: string) =>
  `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(toWebcal(url))}`

const scopeKey = ({ kind, slug }: FeedScope) => `${kind}:${slug}`

const readAll = (): Record<string, SavedFeed> => {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? '{}')
    return saved && typeof saved === 'object' ? (saved as Record<string, SavedFeed>) : {}
  } catch {
    return {}
  }
}

/** The address made on this device, while it is still the feed's current one. */
const readSavedFeed = (scope: FeedScope, createdAt: string | null) => {
  if (!createdAt) return null
  const saved = readAll()[scopeKey(scope)]
  return saved?.createdAt === createdAt ? saved.url : null
}

const saveFeed = (scope: FeedScope, feed: SavedFeed) => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...readAll(), [scopeKey(scope)]: feed }))
  } catch {
    // Private mode: the address lasts while the sheet is open.
  }
}

export type { FeedScope }
export { readSavedFeed, saveFeed, toGoogleCalendar, toWebcal }
