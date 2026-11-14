'use client'

import NextLink from 'next/link'
import { monogramTint, PersonAvatar } from '@/entities/business'
import { useSession } from '@/entities/session'
import { isActivePath, isBookingPath, isCabinetPath, NAV_ITEMS } from '@/shared/config/navigation'
import { useChromePathname } from '@/shared/lib/hooks/useChromePathname'
import styles from './TabBar.module.css'

export const TabBar = () => {
  const pathname = useChromePathname()
  const { customer } = useSession()
  // Owners do not need the pitch for businesses: their cabinet is one tap away in the profile.
  const isOwner = (customer?.businesses?.length ?? 0) > 0 || Boolean(customer?.isAdmin)
  const items = isOwner ? NAV_ITEMS.filter((item) => item.href !== '/business') : NAV_ITEMS

  if (isBookingPath(pathname) || isCabinetPath(pathname)) return null

  return (
    <nav aria-label='Нижнее меню' className={styles.tabBar}>
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
            <span>{label}</span>
          </NextLink>
        )
      })}
    </nav>
  )
}
