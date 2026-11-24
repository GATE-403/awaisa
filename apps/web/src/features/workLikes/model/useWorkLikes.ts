'use client'

import { useSyncExternalStore } from 'react'
import { likeFeedItem } from '@/shared/api/clientApi'
import { isArray, onlyStrings, readJson, writeJson } from '@/shared/lib/storage'
import { deviceSession } from '@/shared/lib/telemetry'

const KEY = 'awaisa:liked-works:v1'
const EMPTY: string[] = []
const listeners = new Set<() => void>()
let cache: string[] | null = null

const read = () => {
  if (cache) return cache
  cache = onlyStrings(readJson(KEY, isArray))
  return cache
}

const write = (ids: string[]) => {
  cache = ids.slice(-500)
  // Private mode: the like still counts on the server for this visit.
  writeJson(KEY, cache)
  for (const listener of listeners) listener()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Which works this device liked (kept on the device, like the favourites) and a toggle that
 * tells the server. The feed answer is cached for a minute, so the shown count adds this
 * device's own like on top of what the server last said.
 */
export const useWorkLikes = () => {
  const liked = useSyncExternalStore(subscribe, read, () => EMPTY)

  const setLiked = (id: string, isLiked: boolean) => {
    const current = read()
    if (isLiked === current.includes(id)) return
    write(isLiked ? [...current, id] : current.filter((item) => item !== id))
    const session = deviceSession()
    if (session) void likeFeedItem(id, session, isLiked).catch(() => undefined)
  }

  return { isLiked: (id: string) => liked.includes(id), setLiked }
}
