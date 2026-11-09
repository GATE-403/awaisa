import { useEffect, useState } from 'react'
import { getErrorMessage } from '@/shared/api/apiError'
import { getMapPlaces } from '@/shared/api/clientApi'
import type { BusinessKind, MapPlace } from '@/shared/api/types'
import type { Point } from '@/shared/ui/MapView/MapView'

type Result = { key: string; places: MapPlace[]; error: string | null }

export const useMapPlaces = (location: Point | null, kind: BusinessKind | undefined) => {
  const [result, setResult] = useState<Result | null>(null)
  const key = `${location?.latitude}|${location?.longitude}|${kind}`

  useEffect(() => {
    const controller = new AbortController()
    getMapPlaces({ lat: location?.latitude, lng: location?.longitude, kind }, controller.signal)
      .then((places) => setResult({ key, places, error: null }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setResult({ key, places: [], error: getErrorMessage(error) })
      })

    return () => controller.abort()
  }, [key, location, kind])

  return {
    // Keep the previous list while a new one loads, so the map does not flash empty.
    places: result?.places ?? [],
    isLoading: result?.key !== key,
    error: result?.key === key ? result.error : null,
  }
}
