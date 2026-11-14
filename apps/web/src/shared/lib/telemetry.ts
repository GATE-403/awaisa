'use client'

// Where people drop out of booking and what breaks for them, sent to our own API
// (`/api/telemetry/*`, see apps/api/src/telemetry) — no third-party tracker, no personal data:
// a random device id, the step and the place's slug.

type FunnelStep =
  | 'catalog'
  | 'business'
  | 'booking_open'
  | 'service'
  | 'specialist'
  | 'time'
  | 'contacts'
  | 'booked'

const SESSION_KEY = 'awaisa:device:v1'
const FLUSH_DELAY_MS = 2000
const MAX_ERRORS_PER_PAGE = 5

let queue: { step: FunnelStep; slug?: string }[] = []
let timer: number | null = null
const sentSteps = new Set<string>()
const sentErrors = new Set<string>()

/** A random id per device, shared with the recommendation signals. */
const deviceSession = () => {
  try {
    const stored = window.localStorage.getItem(SESSION_KEY)
    if (stored) return stored
    const id = crypto.randomUUID()
    window.localStorage.setItem(SESSION_KEY, id)
    return id
  } catch {
    return null
  }
}

const beacon = (path: string, payload: unknown) => {
  const body = JSON.stringify(payload)
  const url = `/api/telemetry/${path}`
  if (navigator.sendBeacon?.(url, new Blob([body], { type: 'application/json' }))) return
  void fetch(url, {
    method: 'POST',
    body,
    headers: { 'content-type': 'application/json' },
    keepalive: true,
  }).catch(() => undefined)
}

const flush = () => {
  if (timer !== null) window.clearTimeout(timer)
  timer = null
  const session = deviceSession()
  if (!session || queue.length === 0) return
  beacon('events', { session, events: queue.slice(0, 50) })
  queue = []
}

/** A funnel step reached; each step and place counts once per page load. */
const trackStep = (step: FunnelStep, slug?: string) => {
  if (typeof window === 'undefined') return
  const key = `${step}|${slug ?? ''}`
  if (sentSteps.has(key)) return
  sentSteps.add(key)
  queue.push({ step, slug })
  if (timer === null) {
    timer = window.setTimeout(flush, FLUSH_DELAY_MS)
    window.addEventListener('pagehide', flush, { once: true })
  }
}

/** An error the visitor ran into; the same message is sent once, five at most per page. */
const reportError = (error: unknown) => {
  if (typeof window === 'undefined') return
  const value = error instanceof Error ? error : new Error(String(error))
  const message = value.message || String(error)
  if (sentErrors.has(message) || sentErrors.size >= MAX_ERRORS_PER_PAGE) return
  sentErrors.add(message)
  beacon('errors', {
    session: deviceSession() ?? undefined,
    message: message.slice(0, 500),
    stack: (value.stack ?? '').slice(0, 4000),
    url: window.location.pathname.slice(0, 500),
  })
}

export type { FunnelStep }
export { deviceSession, reportError, trackStep }
