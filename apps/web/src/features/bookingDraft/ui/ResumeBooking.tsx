'use client'

import { ArrowRight, X } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import { BusinessTile } from '@/entities/business'
import { getBusinessSlug, isBookingPath, isCabinetPath } from '@/shared/config/navigation'
import { useTuckOnScroll } from '@/shared/lib/hooks/useTuckOnScroll'
import { clearDraft, draftHref } from '../lib/bookingDraft'
import { useBookingDraft } from '../model/useBookingDraft'
import styles from './ResumeBooking.module.css'

// «Continue booking» above the tab bar after the client left the booking page half-way.
export const ResumeBooking = () => {
  const pathname = usePathname()
  const draft = useBookingDraft()
  const isTucked = useTuckOnScroll()
  // On another place's page that place's «Ближайшее окно» takes the spot: one pill at a time.
  const pageSlug = getBusinessSlug(pathname)

  if (
    !draft ||
    isBookingPath(pathname) ||
    isCabinetPath(pathname) ||
    pathname === '/feed' ||
    (pageSlug !== null && pageSlug !== draft.slug)
  )
    return null

  return (
    <aside
      className={styles.resume}
      aria-label='Незаконченная запись'
      data-resume-booking=''
      data-tucked={isTucked || undefined}
    >
      <NextLink
        href={draftHref(draft)}
        className={styles.link}
        aria-label={`Продолжить запись: ${draft.serviceName}, ${draft.businessName}`}
      >
        <BusinessTile name={draft.businessName} size='xs' />
        <span className={styles.text}>
          <span className={styles.title}>{draft.serviceName}</span>
          <span className={styles.meta}>Продолжить запись · {draft.businessName}</span>
        </span>
        <span className={styles.go} aria-hidden>
          <span className={styles.goLabel}>Продолжить</span>
          <ArrowRight weight='bold' />
        </span>
      </NextLink>
      <button
        type='button'
        className={styles.dismiss}
        onClick={clearDraft}
        aria-label='Не продолжать'
      >
        <X weight='bold' aria-hidden />
      </button>
    </aside>
  )
}
