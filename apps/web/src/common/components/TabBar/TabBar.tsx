'use client'

import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import { BOOKING_PATH, isActivePath, NAV_ITEMS } from '@/constants/navigation'
import styles from './TabBar.module.css'

export const TabBar = () => {
  const pathname = usePathname()

  if (pathname === BOOKING_PATH) return null

  return (
    <nav aria-label='Нижнее меню' className={styles.tabBar}>
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = isActivePath(pathname, href)

        return (
          <NextLink
            key={href}
            href={href}
            className={styles.tab}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className={styles.icon} strokeWidth={isActive ? 2.25 : 1.75} aria-hidden />
            <span>{label}</span>
          </NextLink>
        )
      })}
    </nav>
  )
}
