'use client'

import { MapPin, MapTrifold, SquaresFour, Storefront, UserCircle } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useSession } from '@/entities/session'
import { KIND_ICONS } from '@/shared/config/kindStyles'
import { isActivePath, isCabinetPath } from '@/shared/config/navigation'
import { BUSINESS_KINDS } from '@/shared/config/platform'
import { useIsScrolled } from '@/shared/lib/hooks/useIsScrolled'
import { Logo } from '@/shared/ui/Logo/Logo'
import { HeaderSearch } from '@/widgets/HeaderSearch'
import styles from './Header.module.css'

const ACTIONS = [
  { href: '/map', label: 'Карта', icon: MapTrifold },
  { href: '/business', label: 'Для бизнеса', icon: Storefront },
]

// A marketplace header: logo, «Каталог», the search field, labelled actions; categories below.
export const Header = () => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isScrolled = useIsScrolled()
  const { status, customer } = useSession()
  const isSignedIn = status === 'signedIn'
  const accountLabel = customer ? `Профиль: ${customer.name || customer.phone}` : 'Профиль и записи'
  const currentKind = pathname === '/' ? searchParams.get('kind') : null
  const headerRef = useRef<HTMLElement>(null)
  const isCabinet = isCabinetPath(pathname)
  // Profile and the business landing are about the person, not shopping: no search, no categories.
  const isSlim =
    pathname === '/bookings' ||
    pathname === '/business' ||
    pathname.startsWith('/business/') ||
    pathname.startsWith('/review/') ||
    pathname.startsWith('/master')

  // Sticky elements below sit under the header; its height changes (rows fold on phones), so the
  // real height is published as --header-height.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the header element mounts again after leaving the cabinet
  useEffect(() => {
    const header = headerRef.current
    if (!header) return
    const root = document.documentElement
    const observer = new ResizeObserver(() => {
      // Fractional, not offsetHeight: a rounded value leaves a sub-pixel gap under the header.
      root.style.setProperty('--header-height', `${header.getBoundingClientRect().height}px`)
    })
    observer.observe(header)

    return () => {
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
          <SquaresFour weight='fill' aria-hidden />
          Каталог
        </NextLink>
        {!isSlim && (
          <div className={styles.search}>
            <HeaderSearch />
          </div>
        )}
        <nav className={styles.actions} aria-label='Основное меню'>
          {ACTIONS.map(({ href, label, icon: Icon }) => (
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
            <UserCircle weight={isSignedIn ? 'fill' : 'regular'} aria-hidden />
            <span aria-hidden='true'>{customer?.name || 'Профиль'}</span>
          </NextLink>
        </nav>
      </div>

      {!isSlim && (
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
