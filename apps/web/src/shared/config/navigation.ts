import type { Icon } from '@phosphor-icons/react'
import {
  MapTrifold,
  PlayCircle,
  SquaresFour,
  Storefront,
  UserCircle,
} from '@phosphor-icons/react/ssr'

type NavItem = {
  href: string
  label: string
  icon: Icon
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Каталог', icon: SquaresFour },
  // Finished work as a vertical feed, each photo one tap from booking it.
  { href: '/feed', label: 'Работы', icon: PlayCircle },
  { href: '/map', label: 'Карта', icon: MapTrifold },
  { href: '/business', label: 'Бизнес', icon: Storefront },
  // Profile and bookings are one page.
  { href: '/bookings', label: 'Профиль', icon: UserCircle },
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
  // Signed SMS links to a visit.
  'v',
  'ui',
  'api',
])

const getBusinessSlug = (pathname: string) => {
  const [segment] = pathname.split('/').filter(Boolean)
  return segment && !APP_SEGMENTS.has(segment) ? segment : null
}

// The owner cabinet is a self-contained app: no client tab bar or marketing footer there.
// The owner's side is its own app: the list of businesses and each cabinet.
const isCabinetPath = (pathname: string) =>
  pathname === '/manage' || pathname.startsWith('/manage/')

const isBookingPath = (pathname: string) => /^\/[^/]+\/book$/.test(pathname)

const isActivePath = (pathname: string, href: string) => {
  if (href === '/') return pathname === '/' || getBusinessSlug(pathname) !== null
  return pathname === href || pathname.startsWith(`${href}/`)
}

export type { NavItem }
export { getBusinessSlug, isActivePath, isBookingPath, isCabinetPath, NAV_ITEMS }
