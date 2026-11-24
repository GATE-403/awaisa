'use client'

import type { DeviceProfile, FunnelEventMeta, FunnelStep } from '@/shared/api/types'
import { rememberChannel } from '@/shared/lib/bookingChannel'

// Where people drop out of each scenario, on which devices, and what breaks for them - sent to
// our own API (`/api/telemetry/*`, see apps/api/src/telemetry). No third-party tracker and no
// personal data: a random device id, the step, the place's slug, short codes (`meta`: which
// field was wrong, which channel) and a coarse profile of the device and its settings.

const SESSION_KEY = 'awaisa:device:v1'
const FLUSH_DELAY_MS = 2000
const MAX_ERRORS_PER_PAGE = 5

type QueuedEvent = { step: FunnelStep; slug?: string; meta?: FunnelEventMeta }

let queue: QueuedEvent[] = []
let timer: number | null = null
let device: DeviceProfile | null = null
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

// The same answer for everyone with the same kind of device and settings: never a fingerprint.
const readDevice = (): DeviceProfile => {
  if (device) return device
  const agent = navigator.userAgent
  const width = window.innerWidth
  // The browser's own font size (Settings → Appearance → Font size): our type is in rem.
  const rootFont = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  const connection = (
    navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean } }
  ).connection
  const effective = connection?.effectiveType
  // The app speaks English only.
  const lang: DeviceProfile['lang'] = 'en'
  const isIos =
    /iPhone|iPad|iPod/.test(agent) || (/Macintosh/.test(agent) && navigator.maxTouchPoints > 1)
  device = {
    type: width < 768 ? 'phone' : width < 1024 ? 'tablet' : 'desktop',
    os: isIos ? 'ios' : /Android/.test(agent) ? 'android' : 'other',
    app: (window as Window & { __NATIVE_APP__?: unknown }).__NATIVE_APP__ ? 'native' : 'web',
    textScale: rootFont >= 28 ? 'huge' : rootFont >= 19 ? 'large' : 'normal',
    net:
      connection?.saveData || (effective && /(^|-)2g$|^3g$/.test(effective))
        ? 'slow'
        : effective
          ? 'fast'
          : 'unknown',
    lang,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    contrastMore: window.matchMedia('(prefers-contrast: more)').matches,
    dark: document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches,
  }
  return device
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
  beacon('events', { session, events: queue.slice(0, 50), device: readDevice() })
  queue = []
}

/**
 * A step reached in a scenario (its flow is worked out by the API). Each step, place and meta
 * counts once per page load. `meta` holds short codes only - `{ field: 'phone' }` - never what
 * a person typed.
 */
const trackStep = (step: FunnelStep, slug?: string, meta?: FunnelEventMeta) => {
  if (typeof window === 'undefined') return
  // A pick from search makes search where the next booking came from.
  if (step === 'search_pick') rememberChannel('search')
  const key = `${step}|${slug ?? ''}|${meta ? JSON.stringify(meta) : ''}`
  if (sentSteps.has(key)) return
  sentSteps.add(key)
  queue.push(meta ? { step, slug, meta } : { step, slug })
  if (timer === null) {
    timer = window.setTimeout(flush, FLUSH_DELAY_MS)
    window.addEventListener('pagehide', flush, { once: true })
  }
}

/** A form refused a value: which field (a code like `phone`), never what was in it. */
const trackFormError = (field: string, slug?: string) => trackStep('form_error', slug, { field })

/** An action in a toast was used in time («Undo»): proof the toast stayed long enough. */
const trackToastAction = (kind: string) => trackStep('toast_action', undefined, { kind })

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
export { deviceSession, reportError, trackFormError, trackStep, trackToastAction }
