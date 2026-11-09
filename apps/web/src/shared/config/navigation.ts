import type { Icon } from '@phosphor-icons/react'
import { MagnifyingGlass, MapTrifold, Storefront, UserCircle } from '@phosphor-icons/react/ssr'

type NavItem = {
  href: string
  label: string
  icon: Icon
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Каталог', icon: MagnifyingGlass },
  { href: '/map', label: 'Карта', icon: MapTrifold },
  // Profile and bookings are one page.
  { href: '/bookings', label: 'Профиль', icon: UserCircle },
  { href: '/business', label: 'Для бизнеса', icon: Storefront },
]

// First path segments that belong to the app; anything else is a business slug.
const APP_SEGMENTS = new Set([
  'bookings',
  'business',
  'login',
  'manage',
  'map',
  'profile',
  'ui',
  'api',
])

const getBusinessSlug = (pathname: string) => {
  const [segment] = pathname.split('/').filter(Boolean)
  return segment && !APP_SEGMENTS.has(segment) ? segment : null
}

// The owner cabinet is a self-contained app: no client tab bar or marketing footer there.
const isCabinetPath = (pathname: string) => pathname.startsWith('/manage/')

const isBookingPath = (pathname: string) => /^\/[^/]+\/book$/.test(pathname)

const isActivePath = (pathname: string, href: string) => {
  if (href === '/') return pathname === '/' || getBusinessSlug(pathname) !== null
  return pathname === href || pathname.startsWith(`${href}/`)
}

export type { NavItem }
export { getBusinessSlug, isActivePath, isBookingPath, isCabinetPath, NAV_ITEMS }
