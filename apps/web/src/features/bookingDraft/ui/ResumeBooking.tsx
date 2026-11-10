'use client'

import { ArrowRight, X } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import { useSyncExternalStore } from 'react'
import { isBookingPath, isCabinetPath } from '@/shared/config/navigation'
import {
  type BookingDraft,
  clearDraft,
  draftHref,
  readDraft,
  subscribeToDraft,
} from '../lib/bookingDraft'
import styles from './ResumeBooking.module.css'

let cachedRaw: string | null = null
let cachedDraft: BookingDraft | null = null

// useSyncExternalStore needs a stable snapshot between reads.
const getSnapshot = () => {
  const draft = readDraft()
  const raw = draft ? JSON.stringify(draft) : null
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cachedDraft = draft
  }

  return cachedDraft
}

// «Continue booking» above the tab bar after the client left the booking page half-way.
export const ResumeBooking = () => {
  const pathname = usePathname()
  const draft = useSyncExternalStore(subscribeToDraft, getSnapshot, () => null)

  if (!draft || isBookingPath(pathname) || isCabinetPath(pathname)) return null

  return (
    <aside className={styles.resume} aria-label='Незаконченная запись'>
      <NextLink href={draftHref(draft)} className={styles.link}>
        <span className={styles.text}>
          <span className={styles.title}>Продолжить запись</span>
          <span className={styles.meta}>
            {draft.serviceName} · {draft.businessName}
          </span>
        </span>
        <ArrowRight className={styles.arrow} weight='bold' aria-hidden />
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
