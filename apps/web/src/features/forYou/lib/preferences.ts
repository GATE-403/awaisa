'use client'

import type { MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { useSyncExternalStore } from 'react'
import { parseJson, readText, writeJson } from '@/shared/lib/storage'

type Interest =
  | 'haircut'
  | 'beard'
  | 'coloring'
  | 'nails'
  | 'brows'
  | 'massage'
  | 'face'
  | 'tattoo'
  | 'health'
  | 'waxing'

/** What matters most when choosing: that part of the picks counts twice. */
type Priority = 'near' | 'soon' | 'rating' | 'price'

type Preferences = {
  gender: 'male' | 'female' | null
  interests: Interest[]
  /** The most a visit should cost, in som; null = any. */
  budget: number | null
  /** What matters most, one or several; older answers have none. */
  priorities?: Priority[]
}

const STORAGE_KEY = 'awaisa:preferences:v1'
const EVENT = 'awaisa:preferences'

const INTERESTS: { value: Interest; label: MessageDescriptor; for?: 'male' | 'female' }[] = [
  { value: 'haircut', label: msg`Haircuts` },
  { value: 'beard', label: msg`Beard`, for: 'male' },
  { value: 'coloring', label: msg`Colouring` },
  { value: 'nails', label: msg`Manicure` },
  { value: 'brows', label: msg`Brows and lashes` },
  { value: 'face', label: msg`Facial care` },
  { value: 'massage', label: msg`Massage and SPA` },
  { value: 'waxing', label: msg`Hair removal` },
  { value: 'tattoo', label: msg`Tattoo` },
  { value: 'health', label: msg`Health` },
]

let cachedRaw: string | null = null
let cached: Preferences | null = null

const read = (): Preferences | null => {
  const raw = readText(STORAGE_KEY)
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cached = parseJson<Preferences>(raw)
  }
  return cached
}

// Private mode: the answers live for this page only.
const savePreferences = (preferences: Preferences) => {
  writeJson(STORAGE_KEY, preferences)
  window.dispatchEvent(new Event(EVENT))
}

const subscribe = (onChange: () => void) => {
  window.addEventListener(EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

/** The client's answers to «Picks for you», kept on the device; null until answered. */
const usePreferences = () => useSyncExternalStore(subscribe, read, () => null)

export type { Interest, Preferences, Priority }
export { INTERESTS, savePreferences, usePreferences }
