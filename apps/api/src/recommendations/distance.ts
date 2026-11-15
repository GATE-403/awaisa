type BranchPoint = { businessId: string; latitude: number; longitude: number }

const EARTH_KM = 6371

const radians = (degrees: number) => (degrees * Math.PI) / 180

/** Great-circle distance (haversine), the same formula the SQL used. */
const haversineKm = (lat: number, lng: number, toLat: number, toLng: number) =>
  EARTH_KM *
  2 *
  Math.asin(
    Math.sqrt(
      Math.sin(radians(toLat - lat) / 2) ** 2 +
        Math.cos(radians(lat)) * Math.cos(radians(toLat)) * Math.sin(radians(toLng - lng) / 2) ** 2,
    ),
  )

/** Each business's nearest active branch from the point, in km. */
const nearestByBusiness = (branches: BranchPoint[], lat: number, lng: number) => {
  const nearest = new Map<string, number>()
  for (const branch of branches) {
    const km = haversineKm(lat, lng, branch.latitude, branch.longitude)
    const known = nearest.get(branch.businessId)
    if (known === undefined || km < known) nearest.set(branch.businessId, km)
  }
  return nearest
}

export type { BranchPoint }
export { haversineKm, nearestByBusiness }
