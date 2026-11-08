import { CalendarCheck, House, LayoutGrid, type LucideIcon } from 'lucide-react'

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Главная', icon: House },
  { href: '/services', label: 'Услуги', icon: LayoutGrid },
  { href: '/bookings', label: 'Мои записи', icon: CalendarCheck },
]

const BOOKING_PATH = '/book'

const isActivePath = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname.startsWith(href)

export type { NavItem }
export { BOOKING_PATH, isActivePath, NAV_ITEMS }
