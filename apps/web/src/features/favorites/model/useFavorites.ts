'use client'

import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'awaisa:favorites:v1'
const EMPTY: string[] = []

let cached: { raw: string | null; ids: string[] } = { raw: null, ids: EMPTY }
const listeners = new Set<() => void>()

const read = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw !== cached.raw) {
      const parsed: unknown = raw ? JSON.parse(raw) : []
      cached = {
        raw,
        ids: Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : EMPTY,
      }
    }
  } catch {
    cached = { raw: null, ids: EMPTY }
  }

  return cached.ids
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  window.addEventListener('storage', listener)

  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

// Favourite services live on the device, like a wishlist before signing in.
export const useFavorites = () => {
  const ids = useSyncExternalStore(subscribe, read, () => EMPTY)

  const toggle = (id: string) => {
    const next = ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      return
    }
    for (const listener of listeners) listener()
  }

  return { ids, isFavorite: (id: string) => ids.includes(id), toggle }
}
