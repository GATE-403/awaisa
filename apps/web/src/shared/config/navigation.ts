import type { Icon } from '@phosphor-icons/react'
import { Compass, MapPin, Storefront, Ticket } from '@phosphor-icons/react/ssr'
import { FanCardsIcon } from '@/shared/ui/FanCardsIcon'

type NavItem = {
  href: string
  label: string
  icon: Icon
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Catalogue', icon: Compass },
  // Finished work as a vertical feed, each photo one tap from booking it.
  { href: '/feed', label: 'Looks', icon: FanCardsIcon },
  { href: '/map', label: 'Map', icon: MapPin },
  { href: '/business', label: 'Business', icon: Storefront },
  // The records lead that page («Bookings»): «My profile» is the public profile, one of each.
  { href: '/bookings', label: 'Bookings', icon: Ticket },
]

// First path segments that belong to the app; anything else is a business slug.
const APP_SEGMENTS = new Set([
  'bookings',
  'business',
  'login',
  'manage',
  'master',
  'map',
  'feed',
  'profile',
  'review',
  // Clients' public profiles.
  'u',
  // The masters' leaderboard.
  'top',
  // Signed checkout links for deposits.
  'pay',
  // Signed links to a fiscal receipt.
  'receipt',
  // Signed SMS links to a visit.
  'v',
  'ui',
  'api',
  // Platform admins' funnels and devices.
  'insights',
  // Platform admins' reports queue.
  'moderation',
  // «What's new».
  'updates',
])

const getBusinessSlug = (pathname: string) => {
  const [segment] = pathname.split('/').filter(Boolean)
  return segment && !APP_SEGMENTS.has(segment) ? segment : null
}

// The owner cabinet is a self-contained app: no client tab bar or marketing footer there.
// The owner's side is its own app: the list of businesses and each cabinet.
const isCabinetPath = (pathname: string) =>
  pathname === '/manage' ||
  pathname.startsWith('/manage/') ||
  pathname === '/insights' ||
  pathname === '/moderation'

// Screens of their own, without the site's header, tab bar and footer: sign-in and the new
// business's setup (the site's navigation pulled the eye from the questions).
const isStandalonePath = (pathname: string) => pathname === '/login' || pathname === '/business/new'

// Pages that send a guest to sign in first: closing sign-in must not lead back to them, or ✕ on
// `/login?next=/manage` bounced straight back to `/login`.
const SIGN_IN_ONLY = ['/manage', '/master', '/business/new', '/insights', '/moderation']

const isSignInOnlyPath = (pathname: string) =>
  SIGN_IN_ONLY.some((path) => pathname === path || pathname.startsWith(`${path}/`))

const isBookingPath = (pathname: string) => /^\/[^/]+\/book$/.test(pathname)

const isActivePath = (pathname: string, href: string) => {
  if (href === '/') return pathname === '/' || getBusinessSlug(pathname) !== null
  return pathname === href || pathname.startsWith(`${href}/`)
}

export type { NavItem }
export {
  getBusinessSlug,
  isActivePath,
  isBookingPath,
  isCabinetPath,
  isSignInOnlyPath,
  isStandalonePath,
  NAV_ITEMS,
}
