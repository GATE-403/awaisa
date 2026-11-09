'use client'

import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import { isActivePath, isBookingPath, isCabinetPath, NAV_ITEMS } from '@/constants/navigation'
import styles from './TabBar.module.css'

export const TabBar = () => {
  const pathname = usePathname()

  if (isBookingPath(pathname) || isCabinetPath(pathname)) return null

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
            <Icon className={styles.icon} weight={isActive ? 'fill' : 'regular'} aria-hidden />
            <span>{label}</span>
          </NextLink>
        )
      })}
    </nav>
  )
}
