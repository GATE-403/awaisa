import type { GeoPlace } from '@awaisa/contracts'

/** One GeoJSON feature as Photon (photon.komoot.io, OpenStreetMap data) answers it. */
type PhotonFeature = {
  geometry?: { coordinates?: [number, number] }
  properties?: {
    name?: string
    street?: string
    housenumber?: string
    district?: string
    locality?: string
    city?: string
    state?: string
    osm_key?: string
  }
}

/** Kyrgyzstan as Photon's box (lon, lat), so a street name finds the one here first. */
const KYRGYZSTAN_BBOX = '69.2,39.1,80.3,43.3'
/** Bishkek, where most places are: results near it rank first. */
const BISHKEK = { latitude: 42.8746, longitude: 74.5698 }

// «Bishkek Park, проспект Чуй, 155» for a mall, «Киевская улица, 77» for a house: what the owner
// would type into «Адрес», and the district and city as the line under it.
const toPlace = (feature: PhotonFeature): GeoPlace | null => {
  const [longitude, latitude] = feature.geometry?.coordinates ?? []
  const props = feature.properties ?? {}
  if (latitude === undefined || longitude === undefined) return null
  const street = [props.street, props.housenumber].filter(Boolean).join(', ')
  // A named building or shop leads; a street's own name or a town is not a building.
  const isNamedPlace =
    Boolean(props.name) &&
    props.name !== props.street &&
    props.osm_key !== 'place' &&
    props.osm_key !== 'highway'
  const address = [isNamedPlace ? props.name : null, street || (isNamedPlace ? null : props.name)]
    .filter(Boolean)
    .join(', ')
  if (!address) return null
  const area = [props.district ?? props.locality, props.city ?? props.state]
    .filter(Boolean)
    .filter((part, index, all) => all.indexOf(part) === index)
    .join(', ')
  return {
    address,
    area,
    latitude: Math.round(latitude * 1e6) / 1e6,
    longitude: Math.round(longitude * 1e6) / 1e6,
  }
}

/** Places from a Photon answer, the same address once. */
const toPlaces = (features: PhotonFeature[]): GeoPlace[] => {
  const seen = new Set<string>()
  return features.flatMap((feature) => {
    const place = toPlace(feature)
    if (!place || seen.has(place.address)) return []
    seen.add(place.address)
    return [place]
  })
}

export type { PhotonFeature }
export { BISHKEK, KYRGYZSTAN_BBOX, toPlace, toPlaces }
