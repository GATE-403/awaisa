'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { LATEST_UPDATE_ID } from '@/shared/config/updates'

// The newest «Что нового» entry this device has opened; a dot marks the way in until it has.
const SEEN_KEY = 'awaisa:updates-seen:v1'
const listeners = new Set<() => void>()

const readSeen = () => {
  try {
    return window.localStorage.getItem(SEEN_KEY)
  } catch {
    return null
  }
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

export const useUpdatesSeen = () => {
  // The server never shows the dot: it cannot know, and a dot that vanishes on load is worse.
  const seen = useSyncExternalStore(subscribe, readSeen, () => LATEST_UPDATE_ID)
  const hasUnread = Boolean(LATEST_UPDATE_ID) && seen !== LATEST_UPDATE_ID

  const markSeen = useCallback(() => {
    try {
      window.localStorage.setItem(SEEN_KEY, LATEST_UPDATE_ID)
    } catch {
      return
    }
    for (const listener of listeners) listener()
  }, [])

  return { hasUnread, markSeen }
}
