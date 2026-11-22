'use client'

import { rememberChannel } from '@/shared/lib/bookingChannel'
import { deviceSession } from '@/shared/lib/telemetry'

// What the shelves learn from: a random id per device, services looked at lately, and what was
// shown, tapped and booked (sent in batches with sendBeacon, so leaving the page never loses them).

type Surface = 'catalog' | 'profile' | 'booking' | 'success' | 'search' | 'due'
type EventKind = 'impression' | 'click' | 'book'
type PickEvent = {
  kind: EventKind
  serviceId: string
  reason: string
  surface: Surface
  position?: number
  /** The answer the card came from and the scorer's version (see GET /recommendations). */
  requestId?: string
  algorithm?: string
  /** On `book`: the booking the pick led to. */
  bookingId?: string
}

const RECENT_KEY = 'awaisa:recent-services:v1'
const CLICK_KEY = 'awaisa:pick-click:v1'
const MAX_RECENT = 5
const FLUSH_DELAY_MS = 2000
const ENDPOINT = '/api/recommendations/events'

let queue: PickEvent[] = []
let timer: number | null = null

const readRecent = (): string[] => {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY)
    return raw ? (JSON.parse(raw) as string[]).slice(0, MAX_RECENT) : []
  } catch {
    return []
  }
}

/** A service the client looked at (chose in the booking form): newest first, five at most. */
const rememberService = (serviceId: string) => {
  try {
    const next = [serviceId, ...readRecent().filter((id) => id !== serviceId)].slice(0, MAX_RECENT)
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    // Storage may be off (private mode): picks just know less.
  }
}

const flush = () => {
  if (timer !== null) window.clearTimeout(timer)
  timer = null
  const session = deviceSession()
  if (!session || queue.length === 0) return
  const events = queue.slice(0, 50)
  queue = queue.slice(50)
  const body = JSON.stringify({ session, events })
  const blob = new Blob([body], { type: 'application/json' })
  if (!navigator.sendBeacon?.(ENDPOINT, blob)) {
    void fetch(ENDPOINT, {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/json' },
      keepalive: true,
    }).catch(() => undefined)
  }
  if (queue.length > 0) flush()
}

const track = (events: PickEvent[]) => {
  queue.push(...events)
  if (timer === null) timer = window.setTimeout(flush, FLUSH_DELAY_MS)
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flush)
}

/** A tap on a pick; kept for the session so a booking of it can be credited to the shelf. */
const trackPickClick = (event: Omit<PickEvent, 'kind'>) => {
  track([{ ...event, kind: 'click' }])
  rememberChannel('for_you')
  try {
    window.sessionStorage.setItem(CLICK_KEY, JSON.stringify(event))
  } catch {
    // Same as above.
  }
}

/** After a booking: if it was a service tapped on a shelf, the shelf gets the credit. */
const trackBookedPick = (serviceId: string, bookingId: string) => {
  try {
    const raw = window.sessionStorage.getItem(CLICK_KEY)
    if (!raw) return
    const click = JSON.parse(raw) as Omit<PickEvent, 'kind'>
    if (click.serviceId !== serviceId) return
    window.sessionStorage.removeItem(CLICK_KEY)
    track([{ ...click, kind: 'book', bookingId }])
    flush()
  } catch {
    // Same as above.
  }
}

export type { Surface }
export { deviceSession, readRecent, rememberService, track, trackBookedPick, trackPickClick }
