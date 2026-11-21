'use client'

import { Menu, MenuItem } from '@awaisa/ui/Menu'
import {
  ArrowSquareOut,
  CaretLeft,
  Compass,
  Megaphone,
  UserCircle,
} from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useSession } from '@/entities/session'
import { ThemeToggle } from '@/features/theme'
import { getBackLabel, readCabinetFrom } from '@/shared/lib/cabinetFrom'
import { useIsScrolled } from '@/shared/lib/hooks/useIsScrolled'
import { useUpdatesSeen } from '@/shared/lib/hooks/useUpdatesSeen'
import { getSafeRedirect } from '@/shared/lib/safeRedirect'
import { rememberUpdatesFrom } from '@/shared/lib/updatesFrom'
import { BusinessSwitcher } from './BusinessSwitcher'
import styles from './CabinetBar.module.css'

interface CabinetBarProps {
  /** Inside a cabinet; without it the bar is the list's (no page link, no switcher). */
  slug?: string
  title: string | null
  isPublished?: boolean
  /** The cabinet's sections: the bar then carries the business (tile and name) and them in one
   * row, instead of a large title on the page. */
  nav?: ReactNode
  logoUrl?: string | null
  /** Where «‹» leads, when not back out of the business side (a page opened from the cabinet
   * goes back to that business and tab). */
  back?: { href: string; label: string }
}

// The cabinet's own window toolbar (macOS 26): «‹» back to where the person came in from (the
// catalog, the profile…), the business as a switcher to the rest of their business side, tools.
export const CabinetBar = ({
  slug,
  title,
  isPublished = true,
  nav,
  logoUrl = null,
  back,
}: CabinetBarProps) => {
  const isScrolled = useIsScrolled()
  const router = useRouter()
  const { customer } = useSession()
  // Read after mount: the page is the same for everyone on the server.
  // undefined until read, so «‹» never shows one word and then another.
  const [entry, setEntry] = useState<string | null | undefined>(undefined)
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

  useEffect(() => {
    const saved = readCabinetFrom()
    setEntry(saved ? getSafeRedirect(saved) : null)
  }, [])

  const backHref = back?.href ?? entry ?? '/bookings'
  const backLabel = back?.label ?? getBackLabel(backHref)

  return (
    <div
      ref={barRef}
      className={styles.bar}
      data-scrolled={isScrolled || undefined}
      data-compact={nav ? true : undefined}
    >
      <div className={styles.inner}>
        <NextLink
          href={backHref}
          className={styles.back}
          aria-label={nav ? `Назад: ${backLabel}` : undefined}
        >
          <CaretLeft weight='bold' aria-hidden />
          {!nav && (back || entry !== undefined) && backLabel}
        </NextLink>
        {nav && slug ? (
          <h1 className={styles.business}>
            <BusinessSwitcher
              slug={slug}
              title={title}
              logoUrl={logoUrl}
              isPublished={isPublished}
            />
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
              onClick={() =>
                rememberUpdatesFrom(`${window.location.pathname}${window.location.search}`)
              }
              className={styles.icon}
              data-unread={hasUnread || undefined}
              aria-label={hasUnread ? 'Что нового — есть обновления' : 'Что нового'}
              title='Что нового'
            >
              <Megaphone aria-hidden />
            </NextLink>
            <ThemeToggle />
            {/* The way out to the client side: one's own profile and bookings, or the catalog. */}
            <Menu
              label={customer ? `Профиль: ${customer.name || customer.phone}` : 'Профиль'}
              className={styles.icon}
              trigger={<UserCircle weight='fill' aria-hidden />}
            >
              <MenuItem icon={<UserCircle aria-hidden />} onClick={() => router.push('/bookings')}>
                Профиль и записи
              </MenuItem>
              <MenuItem icon={<Compass aria-hidden />} onClick={() => router.push('/')}>
                Каталог
              </MenuItem>
            </Menu>
          </span>
        </div>
      </div>
    </div>
  )
}
