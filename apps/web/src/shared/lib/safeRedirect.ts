const DEFAULT_PATH = '/bookings'
// Any origin works: only whether the path stays on it matters.
const BASE = 'https://awaisa.invalid'

/**
 * Only paths on this site. Checking the prefix is not enough: browsers read «\» as «/», so
 * «/\evil.com» (and tabs or newlines inside «//») would leave for another site after sign-in.
 * The value is resolved the way a browser would and kept only if it stays on the same origin.
 */
export const getSafeRedirect = (value: string | null) => {
  if (!value?.startsWith('/')) return DEFAULT_PATH
  try {
    const url = new URL(value, BASE)
    if (url.origin !== BASE) return DEFAULT_PATH
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return DEFAULT_PATH
  }
}
