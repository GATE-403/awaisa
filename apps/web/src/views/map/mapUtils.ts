import { pickTint } from '@/entities/business'
import type { MapPlace } from '@/shared/api/types'
import { formatDistance } from '@/shared/lib/geo'
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

export { formatDistance, toMarkers }
