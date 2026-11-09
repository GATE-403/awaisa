'use client'

import {
  CalendarCheck,
  MapPin,
  MapTrifold,
  SquaresFour,
  Storefront,
  UserCircle,
} from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useSession } from '@/entities/session'
import { KIND_ICONS } from '@/shared/config/kindStyles'
import {
  getBusinessSlug,
  isActivePath,
  isBookingPath,
  isCabinetPath,
} from '@/shared/config/navigation'
import { BUSINESS_KINDS } from '@/shared/config/platform'
import { useIsScrolled } from '@/shared/lib/hooks/useIsScrolled'
import { Logo } from '@/shared/ui/Logo/Logo'
import { HeaderSearch } from '@/widgets/HeaderSearch'
import styles from './Header.module.css'

const ACTIONS = [
  { href: '/map', label: 'Карта', icon: MapTrifold },
  { href: '/bookings', label: 'Мои записи', icon: CalendarCheck },
  { href: '/business', label: 'Для бизнеса', icon: Storefront },
]

// A marketplace header: logo, «Каталог», the search field, labelled actions; categories below.
export const Header = () => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isScrolled = useIsScrolled()
  const { status, customer } = useSession()
  const businessSlug = getBusinessSlug(pathname)
  const showBookingAction = businessSlug !== null && !isBookingPath(pathname)
  const isSignedIn = status === 'signedIn'
  const accountLabel = customer ? `Профиль: ${customer.name || customer.phone}` : 'Войти'
  const currentKind = pathname === '/' ? searchParams.get('kind') : null

  // The cabinet is a work tool with its own toolbar; the site navigation would only distract.
  if (isCabinetPath(pathname)) return null

  return (
    <header className={styles.header} data-scrolled={isScrolled || undefined}>
      <div className={styles.inner}>
        <NextLink href='/' className={styles.home} aria-label='На главную'>
          <Logo />
        </NextLink>
        <NextLink
          href='/'
          className={styles.catalog}
          aria-current={pathname === '/' && !currentKind ? 'page' : undefined}
        >
          <SquaresFour weight='fill' aria-hidden />
          Каталог
        </NextLink>
        <div className={styles.search}>
          <HeaderSearch />
        </div>
        <nav className={styles.actions} aria-label='Основное меню'>
          {ACTIONS.map(({ href, label, icon: Icon }) => (
            <NextLink
              key={href}
              href={href}
              className={styles.action}
              aria-current={isActivePath(pathname, href) ? 'page' : undefined}
            >
              <Icon weight={isActivePath(pathname, href) ? 'fill' : 'regular'} aria-hidden />
              <span>{label}</span>
            </NextLink>
          ))}
          <NextLink
            href={isSignedIn ? '/profile' : '/login'}
            className={styles.action}
            data-account
            aria-label={accountLabel}
            aria-current={pathname === '/profile' ? 'page' : undefined}
          >
            <UserCircle weight={isSignedIn ? 'fill' : 'regular'} aria-hidden />
            <span aria-hidden='true'>{isSignedIn ? customer?.name || 'Профиль' : 'Войти'}</span>
          </NextLink>
        </nav>
        {showBookingAction && (
          <NextLink href={`/${businessSlug}/book`} className={styles.cta}>
            Записаться
          </NextLink>
        )}
      </div>

      <nav className={styles.categories} aria-label='Категории'>
        <div className={styles.categoriesInner}>
          <ul className={styles.categoryList}>
            {BUSINESS_KINDS.map((kind) => {
              const Icon = KIND_ICONS[kind.value]
              return (
                <li key={kind.value}>
                  <NextLink
                    href={`/?kind=${kind.value}`}
                    className={styles.category}
                    aria-current={currentKind === kind.value ? 'page' : undefined}
                  >
                    <Icon weight='duotone' aria-hidden />
                    {kind.label}
                  </NextLink>
                </li>
              )
            })}
          </ul>
          <NextLink href='/map' className={styles.city}>
            <MapPin weight='fill' aria-hidden />
            Бишкек · <span className={styles.cityLink}>рядом на карте</span>
          </NextLink>
        </div>
      </nav>
    </header>
  )
}
