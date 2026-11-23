'use client'

import { useSyncExternalStore } from 'react'

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
  /** The most a visit should cost, сом; null = any. */
  budget: number | null
  /** What matters most, one or several; older answers have none. */
  priorities?: Priority[]
}

const STORAGE_KEY = 'awaisa:preferences:v1'
const EVENT = 'awaisa:preferences'

const INTERESTS: { value: Interest; label: string; for?: 'male' | 'female' }[] = [
  { value: 'haircut', label: 'Стрижки' },
  { value: 'beard', label: 'Борода', for: 'male' },
  { value: 'coloring', label: 'Окрашивание' },
  { value: 'nails', label: 'Маникюр' },
  { value: 'brows', label: 'Брови и ресницы' },
  { value: 'face', label: 'Уход за лицом' },
  { value: 'massage', label: 'Массаж и SPA' },
  { value: 'waxing', label: 'Депиляция' },
  { value: 'tattoo', label: 'Тату' },
  { value: 'health', label: 'Здоровье' },
]

let cachedRaw: string | null = null
let cached: Preferences | null = null

const read = (): Preferences | null => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw !== cachedRaw) {
      cachedRaw = raw
      cached = raw ? (JSON.parse(raw) as Preferences) : null
    }
    return cached
  } catch {
    return null
  }
}

const savePreferences = (preferences: Preferences) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  } catch {
    // Private mode: the answers live for this page only.
  }
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

/** The client's answers to «Подберём для вас», kept on the device; null until answered. */
const usePreferences = () => useSyncExternalStore(subscribe, read, () => null)

export type { Interest, Preferences, Priority }
export { INTERESTS, savePreferences, usePreferences }
