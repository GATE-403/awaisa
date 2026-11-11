import { useEffect, useState } from 'react'
import { getErrorMessage } from '@/shared/api/apiError'
import { getMapPlaces } from '@/shared/api/clientApi'
import type { BusinessKind, MapPlace } from '@/shared/api/types'
import type { Point } from '@/shared/ui/MapView/MapView'

type Result = { key: string; places: MapPlace[]; error: string | null }

const toKey = (location: Point | null, kind: BusinessKind | undefined) =>
  `${location?.latitude}|${location?.longitude}|${kind}`

// `initial` is the list the server rendered for this kind (no location yet); it is not fetched again.
export const useMapPlaces = (
  location: Point | null,
  kind: BusinessKind | undefined,
  initial: MapPlace[] | null = null,
  isEnabled = true,
) => {
  const [result, setResult] = useState<Result | null>(
    initial ? { key: toKey(null, kind), places: initial, error: null } : null,
  )
  const key = toKey(location, kind)
  const hasResult = result?.key === key

  useEffect(() => {
    if (hasResult || !isEnabled) return
    const controller = new AbortController()
    getMapPlaces({ lat: location?.latitude, lng: location?.longitude, kind }, controller.signal)
      .then((places) => setResult({ key, places, error: null }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setResult({ key, places: [], error: getErrorMessage(error) })
      })

    return () => controller.abort()
  }, [key, location, kind, hasResult, isEnabled])

  return {
    // Keep the previous list while a new one loads, so the map does not flash empty.
    places: result?.places ?? [],
    isLoading: result?.key !== key,
    error: result?.key === key ? result.error : null,
  }
}
