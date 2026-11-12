import type { Catalog, ReviewSummary } from '@/shared/api/types'

// Real reviews once there are any; until then the masters' ratings, like the business page header.
const getDisplayRating = (catalog: Catalog, reviews: ReviewSummary) => {
  if (reviews.count > 0) return reviews.average

  const rated = catalog.specialists.filter((specialist) => specialist.rating !== null)
  if (rated.length === 0) return null

  return rated.reduce((sum, specialist) => sum + (specialist.rating ?? 0), 0) / rated.length
}

export { getDisplayRating }
