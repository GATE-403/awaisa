import { useSyncExternalStore } from 'react'
import { readJson, removeKey, writeJson } from './storage'

/** Where the visitor said they are: their geolocation, or a district picked by hand. */
type MyPlace = { label: string; lat: number; lng: number; source: 'gps' | 'area' }

const KEY = 'awaisa:my-place:v1'
const listeners = new Set<() => void>()
let cache: MyPlace | null | undefined

const isMyPlace = (value: unknown): value is MyPlace =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as MyPlace).lat === 'number' &&
  typeof (value as MyPlace).lng === 'number' &&
  Boolean((value as MyPlace).label)

const read = (): MyPlace | null => {
  if (cache !== undefined) return cache
  cache = readJson(KEY, isMyPlace)
  return cache
}

const saveMyPlace = (place: MyPlace | null) => {
  cache = place
  // Private mode: the choice lasts for this visit.
  if (place) writeJson(KEY, place)
  else removeKey(KEY)
  for (const listener of listeners) listener()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The saved place, shared by the map, the booking form's branches and «Для вас». */
const useMyPlace = () => useSyncExternalStore(subscribe, read, () => null)

/** Read outside React (geo helpers); null on the server. */
const readMyPlace = () => (typeof window === 'undefined' ? null : read())

export type { MyPlace }
export { readMyPlace, saveMyPlace, useMyPlace }
