'use client'

import { X } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import type { MouseEvent } from 'react'
import { BusinessTile } from '@/entities/business'
import type { Business } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import styles from './BookingTopBar.module.css'

interface BookingTopBarProps {
  business: Business
  /** Opened over another page (intercepted route): closing goes back to that page. */
  isModal?: boolean
}

// Over the page it was opened from, closing is «back» (that page, its scroll, its state); opened
// by a link from outside, it goes to the place's page.
const useClose = (isModal: boolean) => {
  const router = useRouter()
  return (event: MouseEvent) => {
    if (!isModal) return
    event.preventDefault()
    router.back()
  }
}

// Booking opens like a page in Telegram's in-app browser: a sheet over the dimmed site, its own
// bar with the place and a close button — all attention on the form.
export const BookingTopBar = ({ business, isModal = false }: BookingTopBarProps) => {
  const close = useClose(isModal)
  const t = useT()

  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <NextLink
          href={`/${business.slug}`}
          className={styles.close}
          aria-label={t('Закрыть запись')}
          onClick={close}
        >
          <X weight='bold' aria-hidden />
        </NextLink>
        {/* The place is a big tap target back to its page, like a chat header in Telegram. */}
        <NextLink href={`/${business.slug}`} className={styles.title}>
          <BusinessTile name={business.name} logoUrl={business.logoUrl} size='sm' />
          <span className={styles.text}>
            <h1 className={styles.heading}>{t('Запись')}</h1>
            <span className={styles.place}>{business.name}</span>
          </span>
        </NextLink>
        <span className={styles.spacer} aria-hidden />
      </div>
    </header>
  )
}

// The site stays visible beside the sheet, dimmed; tapping it closes the booking.
export const BookingScrim = ({ slug, isModal = false }: { slug: string; isModal?: boolean }) => {
  const close = useClose(isModal)

  return (
    <NextLink
      href={`/${slug}`}
      className={styles.scrim}
      aria-hidden='true'
      tabIndex={-1}
      onClick={close}
    />
  )
}
