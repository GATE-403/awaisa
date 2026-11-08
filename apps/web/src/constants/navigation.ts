import type { Icon } from '@phosphor-icons/react'
import { CalendarCheck, House, SquaresFour } from '@phosphor-icons/react/ssr'

type NavItem = {
  href: string
  label: string
  icon: Icon
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Главная', icon: House },
  { href: '/services', label: 'Услуги', icon: SquaresFour },
  { href: '/bookings', label: 'Мои записи', icon: CalendarCheck },
]

const BOOKING_PATH = '/book'

const isActivePath = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname.startsWith(href)

export type { NavItem }
export { BOOKING_PATH, isActivePath, NAV_ITEMS }
