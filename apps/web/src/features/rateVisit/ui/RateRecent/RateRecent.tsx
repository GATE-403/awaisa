'use client'

import { Star } from '@phosphor-icons/react/ssr'
import { useEffect, useState } from 'react'
import { parseBookings, readRaw } from '@/entities/booking'
import type { Booking } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { isArray, onlyStrings, readJson, writeJson } from '@/shared/lib/storage'
import { RateVisitSheet } from '../RateVisitSheet/RateVisitSheet'
import styles from './RateRecent.module.css'

interface RateRecentProps {
  /** Past visits, newest first or not - the latest unrated one is picked. */
  history: Booking[]
  today: { dayKey: string } | null
  onRated: (booking: Booking) => void
}

const DISMISSED_KEY = 'awaisa:rate-dismissed:v1'
// A visit older than two weeks is not asked about any more: the memory of it has faded.
const ASK_DAYS = 14
const DAY_MS = 24 * 60 * 60 * 1000

const readDismissed = (): string[] => onlyStrings(readJson(DISMISSED_KEY, isArray))

const whenLabel = (date: string, today: { dayKey: string }) => {
  const days = Math.round(
    (Date.parse(`${today.dayKey}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / DAY_MS,
  )
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return null
}

const tokenOf = (id: string) =>
  parseBookings(readRaw()).find((item) => item.id === id)?.token ?? null

/** «How did it go?» - the latest visit without a review, rated with one tap on a star. */
export const RateRecent = ({ history, today, onRated }: RateRecentProps) => {
  const t = useT()
  const [dismissed, setDismissed] = useState<string[] | null>(null)
  const [picked, setPicked] = useState(0)

  useEffect(() => {
    setDismissed(readDismissed())
  }, [])

  // `review === null` means the API said there is none; old device copies (undefined) are skipped.
  const visit =
    today && dismissed
      ? history
          .filter(
            (booking) =>
              booking.status === 'confirmed' &&
              booking.review === null &&
              !booking.isNoShow &&
              !dismissed.includes(booking.id) &&
              Date.parse(`${today.dayKey}T00:00:00Z`) - Date.parse(`${booking.date}T00:00:00Z`) <=
                ASK_DAYS * DAY_MS,
          )
          .sort((first, second) => second.startsAt.localeCompare(first.startsAt))[0]
      : undefined

  if (!visit || !today) return null

  const whenKey = whenLabel(visit.date, today)
  const when = whenKey ? t(whenKey) : null
  const firstName = visit.specialistName.split(' ')[0]

  const handleDismiss = () => {
    const next = [...(dismissed ?? []), visit.id].slice(-50)
    setDismissed(next)
    // Private mode: it is only asked again next time.
    writeJson(DISMISSED_KEY, next)
  }

  return (
    <section className={styles.card} aria-labelledby='rate-recent-title'>
      <h2 id='rate-recent-title' className={styles.title}>
        {t('How was it?')}
      </h2>
      <p className={styles.meta}>
        {[visit.serviceName, firstName, visit.business.name, when].filter(Boolean).join(' · ')}
      </p>
      <div className={styles.row}>
        <fieldset className={styles.stars}>
          <legend className={styles.legend}>{t('Rate the visit')}</legend>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type='button'
              className={styles.star}
              data-on={value <= picked || undefined}
              aria-label={t('{value} of 5', { value })}
              onClick={() => setPicked(value)}
            >
              <Star weight={value <= picked ? 'fill' : 'regular'} aria-hidden />
            </button>
          ))}
        </fieldset>
        <button type='button' className={styles.later} onClick={handleDismiss}>
          {t('Not now')}
        </button>
      </div>
      {picked > 0 && (
        <RateVisitSheet
          booking={visit}
          access={{ token: tokenOf(visit.id) }}
          initialRating={picked}
          onRated={(review) =>
            onRated({
              ...visit,
              review: { rating: review.rating, comment: review.comment, reply: null },
            })
          }
          onClose={() => setPicked(0)}
        />
      )}
    </section>
  )
}
