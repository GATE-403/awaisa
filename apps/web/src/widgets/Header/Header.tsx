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
import { useEffect, useRef } from 'react'
import { monogramTint, PersonAvatar } from '@/entities/business'
import { getCabinetHref, hasCabinet, useSession } from '@/entities/session'
import { KIND_ICONS } from '@/shared/config/kindStyles'
import {
  getBusinessSlug,
  isActivePath,
  isCabinetPath,
  isStandalonePath,
} from '@/shared/config/navigation'
import { BUSINESS_KINDS } from '@/shared/config/platform'
import { useT } from '@/shared/i18n'
import { useChromePathname } from '@/shared/lib/hooks/useChromePathname'
import { useIsScrolled } from '@/shared/lib/hooks/useIsScrolled'
import { CatalogQuery } from '@/shared/ui/CatalogQuery/CatalogQuery'
import { Logo } from '@/shared/ui/Logo/Logo'
import { HeaderSearch } from '@/widgets/HeaderSearch'
import styles from './Header.module.css'

const ACTIONS = [
  { href: '/feed', label: 'Образы', icon: Sparkle },
  { href: '/map', label: 'Карта', icon: MapTrifold },
  { href: '/top', label: 'Рейтинг', icon: Trophy },
  { href: '/business', label: 'Для бизнеса', icon: Storefront },
]

interface HeaderContentProps {
  /** The kind the catalog shows (`?kind=` on «/»), to mark its chip. */
  catalogKind: string | null
}

// A marketplace header: logo, «Каталог», the search field, labelled actions; categories below.
const HeaderContent = ({ catalogKind }: HeaderContentProps) => {
  const t = useT()
  const pathname = useChromePathname()
  const isScrolled = useIsScrolled()
  const { status, customer } = useSession()
  const _isSignedIn = status === 'signedIn'
  const accountLabel = customer
    ? t('Записи и профиль: {name}', { name: customer.name || customer.phone })
    : t('Записи и профиль')
  const currentKind = pathname === '/' ? catalogKind : null
  const headerRef = useRef<HTMLElement>(null)
  // The cabinet and sign-in are screens of their own: no site navigation there.
  const isCabinet = isCabinetPath(pathname) || isStandalonePath(pathname)
  // Owners get a straight way into their cabinet instead of the pitch for businesses.
  const actions =
    customer && hasCabinet(customer)
      ? ACTIONS.map((action) =>
          action.href === '/business'
            ? { href: getCabinetHref(customer), label: 'Кабинет', icon: action.icon }
            : action,
        )
      : ACTIONS
  // Profile, the business landing and «Что нового» are not shopping: no search, no categories.
  const isSlim =
    pathname === '/bookings' ||
    pathname === '/business' ||
    pathname.startsWith('/business/') ||
    pathname.startsWith('/review/') ||
    pathname.startsWith('/master') ||
    pathname.startsWith('/u/') ||
    pathname === '/updates'
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
      data-site-header
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
        <NextLink href='/' className={styles.home} aria-label={t('На главную')}>
          <Logo />
        </NextLink>
        <NextLink
          href='/'
          className={styles.catalog}
          aria-current={pathname === '/' && !currentKind ? 'page' : undefined}
        >
          <Compass weight='fill' aria-hidden />
          {t('Каталог')}
        </NextLink>
        {!isSlim && (
          <div className={styles.search}>
            <HeaderSearch />
          </div>
        )}
        <nav className={styles.actions} aria-label={t('Основное меню')}>
          {actions.map(({ href, label, icon: Icon }) => (
            <NextLink
              key={href}
              href={href}
              className={styles.action}
              data-mobile={href === '/map' || undefined}
              aria-label={t(label)}
              aria-current={isActivePath(pathname, href) ? 'page' : undefined}
            >
              <Icon weight={isActivePath(pathname, href) ? 'fill' : 'regular'} aria-hidden />
              <span>{t(label)}</span>
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
                name={customer.name || t('Профиль')}
                src={customer.avatarUrl ?? undefined}
                size='sm'
                className={styles.accountAvatar}
                style={monogramTint(customer.name || customer.phone)}
              />
            ) : (
              <UserCircle weight='regular' aria-hidden />
            )}
            <span className={styles.accountName} aria-hidden='true'>
              {customer?.name || t('Профиль')}
            </span>
          </NextLink>
        </nav>
      </div>

      {hasCategories && (
        <nav className={styles.categories} aria-label={t('Категории')}>
          <div className={styles.categoriesInner}>
            <ul className={styles.categoryList}>
              <li>
                <NextLink
                  href='/'
                  className={styles.category}
                  aria-current={pathname === '/' && !currentKind ? 'page' : undefined}
                >
                  <SquaresFour weight='duotone' aria-hidden />
                  {t('Все')}
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
                      {t(kind.label)}
                    </NextLink>
                  </li>
                )
              })}
            </ul>
            {/* On tablets only «Бишкек» shows, so the last categories are not hidden under it;
                the name stays whole and still holds the visible word (WCAG 2.5.3). */}
            <NextLink href='/map' className={styles.city} aria-label={t('Бишкек · рядом на карте')}>
              <MapPin weight='fill' aria-hidden />
              {t('Бишкек')}
              <span className={styles.cityMore}>
                {' · '}
                <span className={styles.cityLink}>{t('рядом на карте')}</span>
              </span>
            </NextLink>
          </div>
        </nav>
      )}
    </header>
  )
}

// The query is read only on the catalog, so the header stays in the cached HTML of other pages.
export const Header = () => (
  <CatalogQuery>
    {(query) => <HeaderContent catalogKind={query?.get('kind') ?? null} />}
  </CatalogQuery>
)
