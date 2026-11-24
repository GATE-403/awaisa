'use client'

import { useSyncExternalStore } from 'react'
import { isArray, onlyStrings, parseJson, readText, writeJson } from '@/shared/lib/storage'

const STORAGE_KEY = 'awaisa:favorites:v1'
const EMPTY: string[] = []

let cached: { raw: string | null; ids: string[] } = { raw: null, ids: EMPTY }
const listeners = new Set<() => void>()

// useSyncExternalStore needs the same array for the same storage value.
const read = () => {
  const raw = readText(STORAGE_KEY)
  if (raw !== cached.raw) cached = { raw, ids: onlyStrings(parseJson(raw, isArray)) }

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
    if (!writeJson(STORAGE_KEY, next)) return
    for (const listener of listeners) listener()
  }

  return { ids, isFavorite: (id: string) => ids.includes(id), toggle }
}
