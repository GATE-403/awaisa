import { REGION } from '@/shared/config/region'

/**
 * The city's districts and landmarks people name when asked «где вы?» (the region's list) - a
 * point inside each, close enough to sort places by distance when the browser's location is not
 * shared.
 */
const CITY_AREAS = REGION.city.areas

export { CITY_AREAS }
