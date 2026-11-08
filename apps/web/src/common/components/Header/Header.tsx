'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import { useIsScrolled } from '@/common/hooks/useIsScrolled'
import { BOOKING_PATH, isActivePath, NAV_ITEMS } from '@/constants/navigation'
import { Logo } from '../Logo/Logo'
import styles from './Header.module.css'

export const Header = () => {
  const pathname = usePathname()
  const isScrolled = useIsScrolled()
  const isBookingPage = pathname === BOOKING_PATH

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
        {!isBookingPage && (
          <ButtonLink render={<NextLink href={BOOKING_PATH} />} size='sm'>
            Записаться
          </ButtonLink>
        )}
      </div>
    </header>
  )
}
