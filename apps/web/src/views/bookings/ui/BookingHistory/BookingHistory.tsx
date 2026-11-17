'use client'

import { Star } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useState } from 'react'
import { getDateParts, parseBookings, readRaw } from '@/entities/booking'
import { RateVisitSheet } from '@/features/rateVisit'
import type { Booking } from '@/shared/api/types'
import { pluralWord } from '@/shared/lib/plural'
import { MoreFade } from '@/shared/ui/MoreFade/MoreFade'
import styles from './BookingHistory.module.css'

interface BookingHistoryProps {
  bookings: Booking[]
  canForget: (id: string) => boolean
  onForget: (id: string) => void
  /** The visit with its new review, so the rest of the page knows it is rated. */
  onRated?: (booking: Booking) => void
}

// The latest few; the rest behind «Ещё N» on a fade, like the upcoming visits.
const FIRST = 5

const getCode = (id: string) => id.replace(/-/g, '').slice(0, 8).toUpperCase()

export const BookingHistory = ({ bookings, canForget, onForget, onRated }: BookingHistoryProps) => {
  const [rated, setRated] = useState<Record<string, number>>({})
  const [rating, setRating] = useState<Booking | null>(null)
  const [isAll, setIsAll] = useState(false)
  const shown = isAll ? bookings : bookings.slice(0, FIRST)
  // A device booking proves itself with its token; signed-in visits go by the session cookie.
  const tokenOf = (id: string) =>
    parseBookings(readRaw()).find((item) => item.id === id)?.token ?? null

  return (
    <>
      <MoreFade
        hiddenCount={Math.max(0, bookings.length - FIRST)}
        isOpen={isAll}
        onToggle={() => setIsAll((value) => !value)}
        label={pluralWord(bookings.length - FIRST, ['запись', 'записи', 'записей'])}
        surface='card'
      >
        <ul className={styles.list}>
          {shown.map((booking) => {
            const { day, month } = getDateParts(booking.date)
            const isCancelled = booking.status === 'cancelled'
            const stars = rated[booking.id] ?? booking.review?.rating ?? null

            return (
              <li key={booking.id}>
                <article className={styles.row} aria-label={`Запись ${getCode(booking.id)}`}>
                  <span className={styles.leaf} aria-hidden='true'>
                    <span className={styles.leafMonth}>{month}</span>
                    <span className={styles.leafDay}>{day}</span>
                  </span>
                  <span className={styles.body}>
                    <span className={styles.title}>{booking.serviceName}</span>
                    {/* The status leads: cut at the end of a narrow row, it used to go first. */}
                    <span className={styles.meta}>
                      {isCancelled ? (
                        <span className={styles.cancelled}>Отменена</span>
                      ) : (
                        'Состоялась'
                      )}
                      {` · ${booking.time} · ${booking.business.name}`}
                    </span>
                  </span>
                  <span className={styles.actions}>
                    {!isCancelled && stars !== null && (
                      <span
                        className={styles.stars}
                        role='img'
                        aria-label={`Ваша оценка: ${stars} из 5`}
                      >
                        <Star weight='fill' aria-hidden />
                        {stars}
                      </span>
                    )}
                    {!isCancelled && !booking.isNoShow && stars === null && (
                      <button
                        type='button'
                        className={styles.rate}
                        onClick={() => setRating(booking)}
                      >
                        Оценить
                      </button>
                    )}
                    {isCancelled && canForget(booking.id) && (
                      <button
                        type='button'
                        className={styles.textButton}
                        onClick={() => onForget(booking.id)}
                        aria-label='Убрать из списка'
                      >
                        Убрать
                      </button>
                    )}
                    <NextLink
                      href={`/${booking.business.slug}/book?service=${booking.serviceId}&specialist=${booking.specialistId}`}
                      className={styles.again}
                    >
                      Снова
                    </NextLink>
                  </span>
                </article>
              </li>
            )
          })}
        </ul>
      </MoreFade>
      {rating && (
        <RateVisitSheet
          booking={rating}
          access={{ token: tokenOf(rating.id) }}
          onRated={(review) => {
            setRated((current) => ({ ...current, [rating.id]: review.rating }))
            onRated?.({
              ...rating,
              review: { rating: review.rating, comment: review.comment, reply: null },
            })
          }}
          onClose={() => setRating(null)}
        />
      )}
    </>
  )
}
