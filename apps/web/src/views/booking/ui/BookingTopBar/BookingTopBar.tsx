'use client'

import { X } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import type { MouseEvent } from 'react'
import { BusinessTile } from '@/entities/business'
import type { Business } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { useSheetDrag } from '@/shared/ui/Sheet/useSheetDrag'
import styles from './BookingTopBar.module.css'

interface BookingTopBarProps {
  business: Business
  /** Opened over another page (intercepted route): closing goes back to that page. */
  isModal?: boolean
  /** The steps as thin segments under the bar, like a story's progress (done, the open one). */
  progress?: { id: string; isDone: boolean; isCurrent: boolean }[]
}

// Over the page it was opened from, closing is “back” (that page, its scroll, its state); opened
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
// bar with the place and a close button - all attention on the form.
export const BookingTopBar = ({ business, isModal = false, progress }: BookingTopBarProps) => {
  const close = useClose(isModal)
  const router = useRouter()
  const t = useT()
  // Pulled down by its bar, the sheet leaves the same way ✕ does.
  const drag = useSheetDrag(() =>
    isModal ? router.back() : router.push(`/${business.slug}`, { scroll: false }),
  )

  return (
    <header className={styles.bar} data-booking-top-bar='' {...drag}>
      <span className={styles.grabber} aria-hidden />
      <div className={styles.inner}>
        <NextLink
          href={`/${business.slug}`}
          className={styles.close}
          aria-label={t('Close booking')}
          onClick={close}
        >
          <X aria-hidden />
        </NextLink>
        {/* The place is a big tap target back to its page, like a chat header in Telegram. */}
        <NextLink href={`/${business.slug}`} className={styles.title}>
          <BusinessTile name={business.name} logoUrl={business.logoUrl} size='sm' />
          <span className={styles.text}>
            <h1 className={styles.heading}>{t('Booking')}</h1>
            <span className={styles.place}>{business.name}</span>
          </span>
        </NextLink>
        <span className={styles.spacer} aria-hidden />
      </div>
      {progress && (
        // A picture of how far along, read out as a progress bar; the steps are changed from
        // their cards (a 3pt segment is no tap target).
        <div
          className={styles.progress}
          role='progressbar'
          aria-label={t('Booking steps')}
          aria-valuemin={0}
          aria-valuemax={progress.length}
          aria-valuenow={progress.filter((step) => step.isDone).length}
        >
          {progress.map((step) => (
            <span
              key={step.id}
              className={styles.segment}
              data-done={step.isDone || undefined}
              data-current={step.isCurrent || undefined}
            />
          ))}
        </div>
      )}
    </header>
  )
}

// The site stays visible beside the sheet, dimmed; tapping it closes the booking.
interface BookingScrimProps {
  /** Opened as a page of its own: the place it leads to. */
  href?: string
  isModal?: boolean
  /** Back after a reload: the page is already dimmed, no second fade. */
  isAlreadyUp?: boolean
}

export const BookingScrim = ({ href, isModal = false, isAlreadyUp = false }: BookingScrimProps) => {
  const router = useRouter()

  // Over a page it closes back to it; the address under the sheet is not known here.
  if (isModal || !href) {
    return (
      <div
        className={styles.scrim}
        aria-hidden='true'
        data-keep-interactive=''
        data-already-up={isAlreadyUp || undefined}
        onClick={() => router.back()}
      />
    )
  }

  return (
    <NextLink
      href={href}
      className={styles.scrim}
      aria-hidden='true'
      tabIndex={-1}
      data-keep-interactive=''
      data-already-up={isAlreadyUp || undefined}
    />
  )
}
