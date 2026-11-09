import type { BusinessKind } from './business.entity.js'

const BUSINESS_KINDS: BusinessKind[] = ['beauty', 'barber', 'nails', 'spa', 'health', 'other']

const SLOT_STEPS = [15, 30, 60] as const

// First path segments the web app uses for its own pages; a business can't take them as a slug.
const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'book',
  'bookings',
  'business',
  'businesses',
  'login',
  'logout',
  'manage',
  'map',
  'me',
  'new',
  'profile',
  'services',
  'settings',
  'ui',
  'awaisa',
])

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/

const DEFAULT_HOURS = { opensMinutes: 10 * 60, closesMinutes: 20 * 60 }

const getSlugProblem = (slug: string) => {
  if (!SLUG_PATTERN.test(slug) || slug.includes('--')) {
    return 'Адрес: латинские буквы, цифры и дефис, от 3 до 48 символов'
  }
  if (RESERVED_SLUGS.has(slug)) return 'Этот адрес занят'

  return null
}

export { BUSINESS_KINDS, DEFAULT_HOURS, getSlugProblem, RESERVED_SLUGS, SLOT_STEPS }
