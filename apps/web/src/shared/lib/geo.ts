import { readMyPlace } from './myPlace'

type Point = { lat: number; lng: number }

// Ask the browser for a position only when the visitor already allowed it: never a prompt. Else
// the place they picked by hand («Asanbay» on the map), when there is one.
const knownPosition = async (): Promise<Point | null> => {
  const picked = readMyPlace()
  const fallback = picked ? { lat: picked.lat, lng: picked.lng } : null
  try {
    const permission = await navigator.permissions?.query({ name: 'geolocation' })
    if (permission?.state !== 'granted') return fallback
    return await new Promise<Point | null>((resolve) =>
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
        () => resolve(fallback),
        { maximumAge: 600_000, timeout: 4000 },
      ),
    )
  } catch {
    return fallback
  }
}

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

/** Great-circle distance in km (haversine), like the API's `/map`. */
const distanceKm = (from: Point, to: Point) => {
  const dLat = toRadians(to.lat - from.lat)
  const dLng = toRadians(to.lng - from.lng)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(a))
}

// «350 m», «1.2 km», «12 km» - precision drops with distance, as in Maps.
const formatDistance = (km: number) => {
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`
  if (km < 10) return `${km.toFixed(1)} km`

  return `${Math.round(km)} km`
}

export type { Point }
export { distanceKm, formatDistance, knownPosition }
