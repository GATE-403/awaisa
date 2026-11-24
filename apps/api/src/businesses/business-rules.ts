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
  'review',
  'u',
  'top',
  'updates',
  'businesses',
  'login',
  'logout',
  'manage',
  'insights',
  'moderation',
  'reports',
  'feed',
  'master',
  'map',
  'pay',
  'receipt',
  'offers',
  'popular-services',
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
    return 'Address: Latin letters, digits and hyphens, 3 to 48 characters'
  }
  // Deleted businesses move to `deleted-…` (admin/business-erasure.ts): nobody registers one.
  if (RESERVED_SLUGS.has(slug) || slug.startsWith('deleted-')) return 'This address is taken'

  return null
}

export { BUSINESS_KINDS, DEFAULT_HOURS, getSlugProblem, RESERVED_SLUGS, SLOT_STEPS }
