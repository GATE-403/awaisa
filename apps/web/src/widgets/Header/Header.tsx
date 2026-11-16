'use client'

import {
  Compass,
  MapPin,
  MapTrifold,
  Sparkle,
  SquaresFour,
  Storefront,
  Trophy,
  UserCircle,
} from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { monogramTint, PersonAvatar } from '@/entities/business'
import { useSession } from '@/entities/session'
import { KIND_ICONS } from '@/shared/config/kindStyles'
import {
  getBusinessSlug,
  isActivePath,
  isCabinetPath,
  isStandalonePath,
} from '@/shared/config/navigation'
import { BUSINESS_KINDS } from '@/shared/config/platform'
import { useChromePathname } from '@/shared/lib/hooks/useChromePathname'
import { useIsScrolled } from '@/shared/lib/hooks/useIsScrolled'
import { Logo } from '@/shared/ui/Logo/Logo'
import { HeaderSearch } from '@/widgets/HeaderSearch'
import styles from './Header.module.css'

const ACTIONS = [
  { href: '/feed', label: 'Образы', icon: Sparkle },
  { href: '/map', label: 'Карта', icon: MapTrifold },
  { href: '/top', label: 'Рейтинг', icon: Trophy },
  { href: '/business', label: 'Для бизнеса', icon: Storefront },
]

// A marketplace header: logo, «Каталог», the search field, labelled actions; categories below.
export const Header = () => {
  const pathname = useChromePathname()
  const searchParams = useSearchParams()
  const isScrolled = useIsScrolled()
  const { status, customer } = useSession()
  const _isSignedIn = status === 'signedIn'
  const accountLabel = customer
    ? `Записи и профиль: ${customer.name || customer.phone}`
    : 'Записи и профиль'
  const currentKind = pathname === '/' ? searchParams.get('kind') : null
  const headerRef = useRef<HTMLElement>(null)
  // The cabinet and sign-in are screens of their own: no site navigation there.
  const isCabinet = isCabinetPath(pathname) || isStandalonePath(pathname)
  // Owners get a straight way into their cabinet instead of the pitch for businesses.
  const owned = customer?.businesses ?? []
  const actions =
    owned.length > 0 || customer?.isAdmin
      ? ACTIONS.map((action) =>
          action.href === '/business'
            ? {
                href:
                  owned.length === 1 && !customer?.isAdmin
                    ? `/manage/${owned[0]?.slug}`
                    : '/manage',
                label: 'Кабинет',
                icon: action.icon,
              }
            : action,
        )
      : ACTIONS
  // Profile and the business landing are about the person, not shopping: no search, no categories.
  const isSlim =
    pathname === '/bookings' ||
    pathname === '/business' ||
    pathname.startsWith('/business/') ||
    pathname.startsWith('/review/') ||
    pathname.startsWith('/master') ||
    pathname.startsWith('/u/')
  // The map and the feed filter by kind themselves; catalog chips would leave them.
  // A business page has its own bar; the catalog's kinds there only push the place down.
  const hasCategories =
    !isSlim && pathname !== '/map' && pathname !== '/feed' && getBusinessSlug(pathname) === null

  // Sticky elements below sit under the header; its height changes (rows fold on phones), so the
  // real height is published as --header-height.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the header element mounts again after leaving the cabinet
  useEffect(() => {
    const header = headerRef.current
    if (!header) return
    const root = document.documentElement
    let frame = 0
    let published = ''
    // Writing a variable on <html> restyles the whole page: at most once a frame, only on change.
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        // Fractional, not offsetHeight: a rounded value leaves a sub-pixel gap under the header.
        const height = `${header.getBoundingClientRect().height}px`
        if (height === published) return
        published = height
        root.style.setProperty('--header-height', height)
      })
    })
    observer.observe(header)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      root.style.removeProperty('--header-height')
    }
  }, [isCabinet])

  // The cabinet is a work tool with its own toolbar; the site navigation would only distract.
  if (isCabinet) return null

  return (
    <header
      ref={headerRef}
      className={styles.header}
      data-scrolled={isScrolled || undefined}
      data-slim={isSlim || undefined}
      // Full-screen on phones: the feed (like Shorts), the map and the profile — only the tab bar.
      data-phone-hidden={
        pathname === '/feed' ||
        pathname === '/bookings' ||
        pathname === '/map' ||
        pathname.startsWith('/u/') ||
        undefined
      }
    >
      <div className={styles.inner}>
        <NextLink href='/' className={styles.home} aria-label='На главную'>
          <Logo />
        </NextLink>
        <NextLink
          href='/'
          className={styles.catalog}
          aria-current={pathname === '/' && !currentKind ? 'page' : undefined}
        >
          <Compass weight='fill' aria-hidden />
          Каталог
        </NextLink>
        {!isSlim && (
          <div className={styles.search}>
            <HeaderSearch />
          </div>
        )}
        <nav className={styles.actions} aria-label='Основное меню'>
          {actions.map(({ href, label, icon: Icon }) => (
            <NextLink
              key={href}
              href={href}
              className={styles.action}
              data-mobile={href === '/map' || undefined}
              aria-label={label}
              aria-current={isActivePath(pathname, href) ? 'page' : undefined}
            >
              <Icon weight={isActivePath(pathname, href) ? 'fill' : 'regular'} aria-hidden />
              <span>{label}</span>
            </NextLink>
          ))}
          <NextLink
            href='/bookings'
            className={styles.action}
            data-account
            aria-label={accountLabel}
            aria-current={pathname === '/bookings' ? 'page' : undefined}
          >
            {/* Signed in, the profile is the person's own face (their photo or initials). */}
            {customer ? (
              <PersonAvatar
                name={customer.name || 'Профиль'}
                src={customer.avatarUrl ?? undefined}
                size='sm'
                className={styles.accountAvatar}
                style={monogramTint(customer.name || customer.phone)}
              />
            ) : (
              <UserCircle weight='regular' aria-hidden />
            )}
            <span aria-hidden='true'>{customer?.name || 'Профиль'}</span>
          </NextLink>
        </nav>
      </div>

      {hasCategories && (
        <nav className={styles.categories} aria-label='Категории'>
          <div className={styles.categoriesInner}>
            <ul className={styles.categoryList}>
              <li>
                <NextLink
                  href='/'
                  className={styles.category}
                  aria-current={pathname === '/' && !currentKind ? 'page' : undefined}
                >
                  <SquaresFour weight='duotone' aria-hidden />
                  Все
                </NextLink>
              </li>
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
      )}
    </header>
  )
}
