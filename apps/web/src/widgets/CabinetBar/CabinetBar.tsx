'use client'

import { ArrowSquareOut, CaretLeft, Megaphone, UserCircle } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
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
}

// The cabinet's own window toolbar (macOS 26): back to the list, the business once scrolled, tools.
export const CabinetBar = ({ slug, title, isPublished = true }: CabinetBarProps) => {
  const isScrolled = useIsScrolled()
  const { customer } = useSession()
  const { hasUnread } = useUpdatesSeen()

  return (
    <div className={styles.bar} data-scrolled={isScrolled || undefined}>
      <div className={styles.inner}>
        <NextLink href={slug ? '/manage' : '/bookings'} className={styles.back}>
          <CaretLeft weight='bold' aria-hidden />
          {slug ? 'Все бизнесы' : 'Профиль'}
        </NextLink>
        <p className={styles.title} aria-hidden={!isScrolled}>
          {title}
          {!isPublished && <span className={styles.hidden}> · скрыта</span>}
        </p>
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
