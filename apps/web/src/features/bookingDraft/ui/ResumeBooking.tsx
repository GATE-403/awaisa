'use client'

import { ArrowRight, X } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { BusinessTile } from '@/entities/business'
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
  const [isTucked, setIsTucked] = useState(false)

  // Like a mini player over a tab bar: it steps aside while the page scrolls down and comes back
  // on the way up, so it never sits on what the client is reading.
  useEffect(() => {
    let last = window.scrollY
    let frame = 0
    const handleScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const y = window.scrollY
        if (Math.abs(y - last) < 8) return
        setIsTucked(y > last && y > 120)
        last = y
      })
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  if (!draft || isBookingPath(pathname) || isCabinetPath(pathname) || pathname === '/feed')
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
          <span className={styles.title}>
            <span className={styles.prefix}>Продолжить: </span>
            {draft.serviceName}
          </span>
          <span className={styles.meta}>
            <span className={styles.status}>Не закончена</span> · {draft.businessName}
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
