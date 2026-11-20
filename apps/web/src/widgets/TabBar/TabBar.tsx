'use client'

import NextLink from 'next/link'
import type { CSSProperties } from 'react'
import { monogramTint, PersonAvatar } from '@/entities/business'
import { useSession } from '@/entities/session'
import {
  isActivePath,
  isBookingPath,
  isCabinetPath,
  isStandalonePath,
  NAV_ITEMS,
} from '@/shared/config/navigation'
import { useChromePathname } from '@/shared/lib/hooks/useChromePathname'
import { useTuckOnScroll } from '@/shared/lib/hooks/useTuckOnScroll'
import styles from './TabBar.module.css'

export const TabBar = () => {
  const pathname = useChromePathname()
  const { customer } = useSession()
  // Reading down a long page, the bar steps aside like Safari's toolbar; any scroll up brings it
  // back. Pages that do not scroll the window (map, «Образы») keep it.
  const isTucked = useTuckOnScroll()
  // Owners do not need the pitch for businesses: their cabinet is one tap away in the profile.
  const isOwner = (customer?.businesses?.length ?? 0) > 0 || Boolean(customer?.isAdmin)
  const items = isOwner ? NAV_ITEMS.filter((item) => item.href !== '/business') : NAV_ITEMS

  if (isBookingPath(pathname) || isCabinetPath(pathname) || isStandalonePath(pathname)) return null

  const activeIndex = items.findIndex((item) => isActivePath(pathname, item.href))

  return (
    <nav
      aria-label='Нижнее меню'
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
                name={customer.name || 'Профиль'}
                src={customer.avatarUrl ?? undefined}
                size='sm'
                className={styles.avatar}
                style={monogramTint(customer.name || customer.phone)}
              />
            ) : (
              <Icon className={styles.icon} weight={isActive ? 'fill' : 'regular'} aria-hidden />
            )}
            <span className={styles.label}>{label}</span>
          </NextLink>
        )
      })}
    </nav>
  )
}
