import 'server-only'
import { API_URL } from '@/shared/config/api'
import { toApiError } from './apiError'

// A slow API must not hold a page's render: past this the read counts as failed.
const API_TIMEOUT_MS = 8000
// The last answer that worked, per path, kept in this process. When the API is down, slow or
// answering 5xx, public pages are drawn from it instead of an error page. Bounded so a crawl over
// every search cannot grow it without end; the oldest path goes first.
const LAST_GOOD_LIMIT = 300
const lastGood = new Map<string, unknown>()

const NOT_FOUND = 404
const TOO_MANY_REQUESTS = 429
const SERVER_ERROR = 500

interface ReadResult<T> {
  data: T
  /** Served from the last good answer (or the fallback): cache it briefly, not for minutes. */
  isStale: boolean
}

interface ReadOptions<T> {
  /** What to show when there is neither an answer nor a remembered one (a secondary block). */
  fallback?: T
  /** Answer null for a 404 (a slug that does not exist) instead of throwing. */
  isNullOnNotFound?: boolean
}

const remember = (path: string, data: unknown) => {
  lastGood.delete(path)
  lastGood.set(path, data)
  if (lastGood.size > LAST_GOOD_LIMIT) {
    const oldest = lastGood.keys().next().value
    if (oldest !== undefined) lastGood.delete(oldest)
  }
}

const isOutage = (status: number) => status >= SERVER_ERROR || status === TOO_MANY_REQUESTS

const readApi = async <T>(path: string, options: ReadOptions<T> = {}): Promise<ReadResult<T>> => {
  const recover = (cause: unknown): ReadResult<T> => {
    if (lastGood.has(path)) {
      console.warn(`API unavailable, serving the last good answer: ${path.split('?')[0]}`)
      return { data: lastGood.get(path) as T, isStale: true }
    }
    if ('fallback' in options) return { data: options.fallback as T, isStale: true }
    throw cause
  }

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, { signal: AbortSignal.timeout(API_TIMEOUT_MS) })
  } catch (error) {
    return recover(error)
  }

  if (response.status === NOT_FOUND && options.isNullOnNotFound) {
    return { data: null as T, isStale: false }
  }
  if (!response.ok) {
    const error = await toApiError(response)
    if (isOutage(response.status)) return recover(error)
    if ('fallback' in options) return { data: options.fallback as T, isStale: false }
    throw error
  }

  const data = (await response.json()) as T
  remember(path, data)
  return { data, isStale: false }
}

export { API_TIMEOUT_MS, readApi }
