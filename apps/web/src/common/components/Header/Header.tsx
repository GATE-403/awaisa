'use client'

import { UserCircle } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import { useIsScrolled } from '@/common/hooks/useIsScrolled'
import { useSession } from '@/common/hooks/useSession'
import {
  getBusinessSlug,
  isActivePath,
  isBookingPath,
  isCabinetPath,
  NAV_ITEMS,
} from '@/constants/navigation'
import { Logo } from '../Logo/Logo'
import { SearchPanel } from '../SearchPanel/SearchPanel'
import { ThemeToggle } from '../ThemeToggle/ThemeToggle'
import styles from './Header.module.css'

export const Header = () => {
  const pathname = usePathname()
  const isScrolled = useIsScrolled()
  const { status, customer } = useSession()
  const businessSlug = getBusinessSlug(pathname)
  const showBookingAction = businessSlug !== null && !isBookingPath(pathname)
  const accountLabel = customer ? `Профиль: ${customer.name || customer.phone}` : 'Войти'

  // The cabinet is a work tool with its own toolbar; the site navigation would only distract.
  if (isCabinetPath(pathname)) return null

  return (
    <header className={styles.header} data-scrolled={isScrolled || undefined}>
      <div className={styles.inner}>
        <NextLink href='/' className={styles.home} aria-label='На главную'>
          <Logo />
        </NextLink>
        <nav aria-label='Основное меню' className={styles.nav}>
          {NAV_ITEMS.map(({ href, label }) => (
            <NextLink
              key={href}
              href={href}
              className={styles.navLink}
              aria-current={isActivePath(pathname, href) ? 'page' : undefined}
            >
              {label}
            </NextLink>
          ))}
        </nav>
        <div className={styles.actions}>
          {/* macOS 26 toolbar button group: one glass capsule from 768px. */}
          <span className={styles.group}>
            <SearchPanel />
            <span className={styles.theme}>
              <ThemeToggle />
            </span>
            <NextLink
              href={status === 'signedIn' ? '/profile' : '/login'}
              className={styles.account}
              aria-label={accountLabel}
              aria-current={pathname === '/profile' ? 'page' : undefined}
              data-signed-in={status === 'signedIn' || undefined}
            >
              <UserCircle weight={status === 'signedIn' ? 'fill' : 'regular'} aria-hidden />
            </NextLink>
          </span>
          {showBookingAction && (
            <NextLink href={`/${businessSlug}/book`} className={styles.cta}>
              Записаться
            </NextLink>
          )}
        </div>
      </div>
    </header>
  )
}
