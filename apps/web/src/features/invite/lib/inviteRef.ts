'use client'

// «Пригласить друга»: a `?ref=<handle or id>` from a friend's link is kept on this device for
// 30 days and sent with the first booking, so the friend who shared it gets the credit.
const KEY = 'awaisa:ref:v1'
const TTL_MS = 30 * 86_400_000
const REF_PATTERN = /^[a-z0-9][a-z0-9_.]{2,19}$/i

const rememberRef = (ref: string) => {
  if (!REF_PATTERN.test(ref)) return
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ref, at: Date.now() }))
  } catch {
    // Storage may be off: the invitation is then just a link.
  }
}

const readRef = (): string | undefined => {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return undefined
    const { ref, at } = JSON.parse(raw) as { ref: string; at: number }
    return Date.now() - at < TTL_MS ? ref : undefined
  } catch {
    return undefined
  }
}

/** The link a client shares: their profile, carrying their own ref. */
const inviteUrl = (handleOrId: string) =>
  `${window.location.origin}/u/${handleOrId}?ref=${encodeURIComponent(handleOrId)}`

export { inviteUrl, readRef, rememberRef }
