'use client'

import NextLink from 'next/link'
import type { CSSProperties } from 'react'
import { monogramTint, PersonAvatar } from '@/entities/business'
import { getCabinetHref, hasCabinet, useSession } from '@/entities/session'
import {
  isActivePath,
  isBookingPath,
  isCabinetPath,
  isStandalonePath,
  NAV_ITEMS,
} from '@/shared/config/navigation'
import { useT } from '@/shared/i18n'
import { useCabinetEntry } from '@/shared/lib/hooks/useCabinetEntry'
import { useChromePathname } from '@/shared/lib/hooks/useChromePathname'
import { useTuckOnScroll } from '@/shared/lib/hooks/useTuckOnScroll'
import styles from './TabBar.module.css'

export const TabBar = () => {
  const t = useT()
  const pathname = useChromePathname()
  const { customer } = useSession()
  // Reading down a long page, the bar steps aside like Safari's toolbar; any scroll up brings it
  // back. Pages that do not scroll the window (map, «Образы») keep it.
  const isTucked = useTuckOnScroll()
  // Notes where someone enters the cabinet from, for its «‹» (the tab bar is always mounted).
  useCabinetEntry()
  // Owners do not need the pitch for businesses: their tab leads straight into the cabinet.
  const items =
    customer && hasCabinet(customer)
      ? NAV_ITEMS.map((item) =>
          item.href === '/business'
            ? { ...item, href: getCabinetHref(customer), label: 'Кабинет' }
            : item,
        )
      : NAV_ITEMS

  if (isBookingPath(pathname) || isCabinetPath(pathname) || isStandalonePath(pathname)) return null

  const activeIndex = items.findIndex((item) => isActivePath(pathname, item.href))

  return (
    <nav
      aria-label={t('Нижнее меню')}
      data-site-tabbar
      className={styles.tabBar}
      data-tucked={isTucked || undefined}
    >
      {/* One highlight that slides to the chosen tab, like iOS's tab bar — not a fill per tab. */}
      <span
        className={styles.indicator}
        data-hidden={activeIndex < 0 || undefined}
        style={{ '--index': Math.max(0, activeIndex), '--count': items.length } as CSSProperties}
        aria-hidden
      />
      {items.map(({ href, label, icon: Icon }) => {
        const isActive = isActivePath(pathname, href)

        return (
          <NextLink
            key={href}
            href={href}
            className={styles.tab}
            aria-current={isActive ? 'page' : undefined}
          >
            {href === '/bookings' && customer ? (
              <PersonAvatar
                name={customer.name || t('Профиль')}
                src={customer.avatarUrl ?? undefined}
                size='sm'
                className={styles.avatar}
                style={monogramTint(customer.name || customer.phone)}
              />
            ) : (
              <Icon className={styles.icon} weight={isActive ? 'fill' : 'regular'} aria-hidden />
            )}
            <span className={styles.label}>{t(label)}</span>
          </NextLink>
        )
      })}
    </nav>
  )
}
