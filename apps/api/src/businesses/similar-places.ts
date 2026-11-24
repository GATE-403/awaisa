import { haversineKm } from '../recommendations/distance.js'

type Pin = { latitude: number; longitude: number }

/** What «похоже» is judged by, for the place being viewed and each candidate of its kind. */
type PlaceSignals = {
  slug: string
  pins: Pin[]
  services: string[]
  minPrice: number | null
  rating: number | null
  reviewsCount: number
}

// Nearer places score up to this much, nothing from NEAR_LIMIT_KM on: someone looking at a place
// in one district rarely crosses the city for the same haircut.
const NEAR_WEIGHT = 3
const NEAR_LIMIT_KM = 10
// The same services (by name) - a nail bar is like another nail bar, not a full salon.
const MENU_WEIGHT = 3
// A similar price level: no gap, full weight; a place three times dearer or cheaper, none.
const PRICE_WEIGHT = 1.5
const PRICE_SPAN = Math.log(3)
// Rating pulled toward the platform's usual 4.3 until there are reviews (the same as «Для вас»).
const RATING_WEIGHT = 2
const RATING_PRIOR = 4.3
const RATING_PRIOR_REVIEWS = 10

const normalizeService = (name: string) =>
  name
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

const nearestKm = (from: Pin[], to: Pin[]) => {
  let best: number | null = null
  for (const a of from) {
    for (const b of to) {
      const km = haversineKm(a.latitude, a.longitude, b.latitude, b.longitude)
      if (best === null || km < best) best = km
    }
  }
  return best
}

const menuOverlap = (a: string[], b: string[]) => {
  const left = new Set(a.map(normalizeService))
  const right = new Set(b.map(normalizeService))
  if (left.size === 0 || right.size === 0) return 0
  let shared = 0
  for (const name of left) if (right.has(name)) shared += 1
  return shared / (left.size + right.size - shared)
}

const priceCloseness = (a: number | null, b: number | null) => {
  if (!a || !b) return 0
  return Math.max(0, 1 - Math.abs(Math.log(a / b)) / PRICE_SPAN)
}

const trustedRating = (place: PlaceSignals) => {
  const total = (place.rating ?? 0) * place.reviewsCount + RATING_PRIOR * RATING_PRIOR_REVIEWS
  return total / (place.reviewsCount + RATING_PRIOR_REVIEWS)
}

const similarityScore = (target: PlaceSignals, candidate: PlaceSignals) => {
  const km = nearestKm(target.pins, candidate.pins)
  const near = km === null ? 0 : NEAR_WEIGHT * Math.max(0, 1 - km / NEAR_LIMIT_KM)
  return (
    near +
    MENU_WEIGHT * menuOverlap(target.services, candidate.services) +
    PRICE_WEIGHT * priceCloseness(target.minPrice, candidate.minPrice) +
    RATING_WEIGHT * (trustedRating(candidate) - RATING_PRIOR)
  )
}

/** The candidates' slugs, most like the target first; the target itself is left out. */
const rankSimilarPlaces = (target: PlaceSignals, candidates: PlaceSignals[]) =>
  candidates
    .filter((candidate) => candidate.slug !== target.slug)
    .map((candidate) => ({ slug: candidate.slug, score: similarityScore(target, candidate) }))
    .sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug))
    .map((entry) => entry.slug)

export type { PlaceSignals }
export { menuOverlap, rankSimilarPlaces, similarityScore }
