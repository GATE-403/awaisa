'use client'

import { useSyncExternalStore } from 'react'
import type { WaitlistEntry } from '@/shared/api/types'

// Guests keep their waitlist entries on the device, like their bookings: the token lets them
// see whether a time opened up and leave the list.
type StoredWaitlistEntry = { id: string; token: string; snapshot: WaitlistEntry }

const STORAGE_KEY = 'awaisa:waitlist:v1'
const CHANGE_EVENT = 'awaisa:waitlist-change'
const EMPTY: StoredWaitlistEntry[] = []

const readRaw = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

const isStored = (value: unknown): value is StoredWaitlistEntry =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as StoredWaitlistEntry).id === 'string' &&
  typeof (value as StoredWaitlistEntry).token === 'string' &&
  typeof (value as StoredWaitlistEntry).snapshot === 'object'

let cachedRaw: string | null = null
let cached: StoredWaitlistEntry[] = EMPTY

// useSyncExternalStore needs the same array for the same storage value.
const readStored = () => {
  const raw = readRaw()
  if (raw === cachedRaw) return cached
  cachedRaw = raw
  try {
    const value: unknown = raw ? JSON.parse(raw) : []
    cached = Array.isArray(value) ? value.filter(isStored) : EMPTY
  } catch {
    cached = EMPTY
  }
  return cached
}

const write = (entries: StoredWaitlistEntry[]) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    return
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

const saveWaitlistEntry = (entry: StoredWaitlistEntry) =>
  write([entry, ...readStored().filter((item) => item.id !== entry.id)])

const updateWaitlistSnapshot = (snapshot: WaitlistEntry) =>
  write(readStored().map((item) => (item.id === snapshot.id ? { ...item, snapshot } : item)))

const forgetWaitlistEntry = (id: string) => write(readStored().filter((item) => item.id !== id))

const subscribe = (onChange: () => void) => {
  window.addEventListener('storage', onChange)
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}

const useStoredWaitlist = () => useSyncExternalStore(subscribe, readStored, () => EMPTY)

export type { StoredWaitlistEntry }
export {
  forgetWaitlistEntry,
  readStored as readStoredWaitlist,
  saveWaitlistEntry,
  updateWaitlistSnapshot,
  useStoredWaitlist,
}
