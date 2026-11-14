import { useSyncExternalStore } from 'react'

/** Where the visitor said they are: their geolocation, or a district picked by hand. */
type MyPlace = { label: string; lat: number; lng: number; source: 'gps' | 'area' }

const KEY = 'awaisa:my-place:v1'
const listeners = new Set<() => void>()
let cache: MyPlace | null | undefined

const read = (): MyPlace | null => {
  if (cache !== undefined) return cache
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) ?? 'null') as MyPlace | null
    cache =
      value && typeof value.lat === 'number' && typeof value.lng === 'number' && value.label
        ? value
        : null
  } catch {
    cache = null
  }
  return cache
}

const saveMyPlace = (place: MyPlace | null) => {
  cache = place
  try {
    if (place) window.localStorage.setItem(KEY, JSON.stringify(place))
    else window.localStorage.removeItem(KEY)
  } catch {
    // Private mode: the choice lasts for this visit.
  }
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
