'use client'

import { ArrowRight, CalendarBlank, X } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import {
  getBusinessSlug,
  isBookingPath,
  isCabinetPath,
  isStandalonePath,
} from '@/shared/config/navigation'
import { useTuckOnScroll } from '@/shared/lib/hooks/useTuckOnScroll'
import { clearDraft, DRAFT_STEPS, draftHref } from '../lib/bookingDraft'
import { useBookingDraft } from '../model/useBookingDraft'
import styles from './ResumeBooking.module.css'

// «Continue booking» above the tab bar after the client left the booking page half-way.
export const ResumeBooking = () => {
  const pathname = usePathname()
  const draft = useBookingDraft()
  const isTucked = useTuckOnScroll()
  // On another place's page that place's «Ближайшее окно» takes the spot: one pill at a time.
  const pageSlug = getBusinessSlug(pathname)

  const stepsDone = Math.min(Math.max(draft?.stepsDone ?? 1, 1), DRAFT_STEPS)
  // The ring's circumference for r = 14.
  const circumference = 2 * Math.PI * 14

  if (
    !draft ||
    isBookingPath(pathname) ||
    isCabinetPath(pathname) ||
    isStandalonePath(pathname) ||
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
        aria-label={`Продолжить запись: ${draft.serviceName}, ${draft.businessName}. Готово ${stepsDone} из ${DRAFT_STEPS} шагов`}
      >
        {/* How far the booking got, like a download ring, with a calendar glyph in the
            capsule's own colour (a tinted monogram vanished on the inverted fill). */}
        <span className={styles.progress} aria-hidden>
          <svg viewBox='0 0 32 32' className={styles.ring} aria-hidden='true'>
            <circle cx='16' cy='16' r='14' className={styles.ringTrack} />
            <circle
              cx='16'
              cy='16'
              r='14'
              className={styles.ringValue}
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - stepsDone / DRAFT_STEPS)}
            />
          </svg>
          <CalendarBlank weight='fill' className={styles.glyph} />
        </span>
        <span className={styles.text}>
          <span className={styles.title}>{draft.serviceName}</span>
          <span className={styles.meta}>
            Готово {stepsDone} из {DRAFT_STEPS} · {draft.businessName}
          </span>
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
