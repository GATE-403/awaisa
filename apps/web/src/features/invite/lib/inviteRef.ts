'use client'

import { readJson, writeJson } from '@/shared/lib/storage'

// «Invite a friend»: a `?ref=<handle or id>` from a friend's link is kept on this device for
// 30 days and sent with the first booking, so the friend who shared it gets the credit.
const KEY = 'awaisa:ref:v1'
const TTL_MS = 30 * 86_400_000
const REF_PATTERN = /^[a-z0-9][a-z0-9_.]{2,19}$/i

const rememberRef = (ref: string) => {
  if (!REF_PATTERN.test(ref)) return
  // Storage may be off: the invitation is then just a link.
  writeJson(KEY, { ref, at: Date.now() })
}

type StoredRef = { ref: string; at: number }

const isObject = (value: unknown): value is StoredRef => typeof value === 'object' && value !== null

const readRef = (): string | undefined => {
  const stored = readJson(KEY, isObject)
  if (!stored) return undefined
  return Date.now() - stored.at < TTL_MS ? stored.ref : undefined
}

/** The link a client shares: their profile, carrying their own ref. */
const inviteUrl = (handleOrId: string) =>
  `${window.location.origin}/u/${handleOrId}?ref=${encodeURIComponent(handleOrId)}`

export { inviteUrl, readRef, rememberRef }
