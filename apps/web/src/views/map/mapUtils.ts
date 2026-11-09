import { pickTint } from '@/entities/business'
import type { MapPlace } from '@/shared/api/types'
import type { MapMarker } from '@/shared/ui/MapView/MapView'

const toMarkers = (places: MapPlace[]): MapMarker[] =>
  places.map((place) => ({
    id: place.branchId,
    latitude: place.latitude,
    longitude: place.longitude,
    label: place.name.charAt(0).toUpperCase(),
    title: `${place.name}, ${place.address || place.branchName}`,
    tint: pickTint(place.name),
  }))

// «350 м», «1,2 км», «12 км» — precision drops with distance, as in Maps.
const formatDistance = (km: number) => {
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} м`
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} км`

  return `${Math.round(km)} км`
}

export { formatDistance, toMarkers }
