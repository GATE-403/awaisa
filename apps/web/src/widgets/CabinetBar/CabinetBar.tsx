'use client'

import { ArrowSquareOut, CaretLeft, Megaphone, UserCircle } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { type ReactNode, useEffect, useRef } from 'react'
import { BusinessTile } from '@/entities/business'
import { useSession } from '@/entities/session'
import { ThemeToggle } from '@/features/theme'
import { useIsScrolled } from '@/shared/lib/hooks/useIsScrolled'
import { useUpdatesSeen } from '@/shared/lib/hooks/useUpdatesSeen'
import styles from './CabinetBar.module.css'

interface CabinetBarProps {
  /** Inside a cabinet; without it the bar is the list's («‹ Профиль», no page link). */
  slug?: string
  title: string | null
  isPublished?: boolean
  /** The cabinet's sections: the bar then carries the business (tile and name) and them in one
   * row, instead of a large title on the page. */
  nav?: ReactNode
  logoUrl?: string | null
}

// The cabinet's own window toolbar (macOS 26): back to the list, the business once scrolled, tools.
export const CabinetBar = ({
  slug,
  title,
  isPublished = true,
  nav,
  logoUrl = null,
}: CabinetBarProps) => {
  const isScrolled = useIsScrolled()
  const { customer } = useSession()
  const { hasUnread } = useUpdatesSeen()
  const barRef = useRef<HTMLDivElement>(null)
  const isCompact = Boolean(nav)

  // With the sections in the bar, toasts come down under it: on phones they used to land right
  // over the tabs just when someone wanted to switch after saving.
  useEffect(() => {
    const bar = barRef.current
    if (!isCompact || !bar) return
    const root = document.documentElement
    const observer = new ResizeObserver(() => {
      root.style.setProperty('--toast-top', `${bar.getBoundingClientRect().bottom}px`)
    })
    observer.observe(bar)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--toast-top')
    }
  }, [isCompact])

  return (
    <div
      ref={barRef}
      className={styles.bar}
      data-scrolled={isScrolled || undefined}
      data-compact={nav ? true : undefined}
    >
      <div className={styles.inner}>
        <NextLink
          href={slug ? '/manage' : '/bookings'}
          className={styles.back}
          aria-label={nav ? 'Все бизнесы' : undefined}
        >
          <CaretLeft weight='bold' aria-hidden />
          {!nav && (slug ? 'Все бизнесы' : 'Профиль')}
        </NextLink>
        {nav ? (
          <h1 className={styles.business}>
            {title && <BusinessTile name={title} logoUrl={logoUrl} size='sm' />}
            <span className={styles.businessName}>
              {title}
              {!isPublished && <span className={styles.hidden}> · скрыта</span>}
            </span>
          </h1>
        ) : (
          <p className={styles.title} aria-hidden={!isScrolled}>
            {title}
            {!isPublished && <span className={styles.hidden}> · скрыта</span>}
          </p>
        )}
        {nav && <div className={styles.nav}>{nav}</div>}
        <div className={styles.tools}>
          <span className={styles.group}>
            {slug && (
              <NextLink
                href={`/${slug}`}
                target='_blank'
                className={styles.icon}
                aria-label='Открыть страницу бизнеса'
                title='Открыть страницу бизнеса'
              >
                <ArrowSquareOut aria-hidden />
              </NextLink>
            )}
            {/* What changed in Awaisa; a dot until this device has read the newest entry. */}
            <NextLink
              href='/updates'
              className={styles.icon}
              data-unread={hasUnread || undefined}
              aria-label={hasUnread ? 'Что нового — есть обновления' : 'Что нового'}
              title='Что нового'
            >
              <Megaphone aria-hidden />
            </NextLink>
            <ThemeToggle />
            <NextLink
              href='/bookings'
              className={styles.icon}
              aria-label={customer ? `Профиль: ${customer.name || customer.phone}` : 'Профиль'}
            >
              <UserCircle weight='fill' aria-hidden />
            </NextLink>
          </span>
        </div>
      </div>
    </div>
  )
}
