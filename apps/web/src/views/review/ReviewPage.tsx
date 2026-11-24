'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import { Star } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useState } from 'react'
import { formatDayLong } from '@/entities/booking'
import { BusinessTile } from '@/entities/business'
import { RateVisitForm } from '@/features/rateVisit'
import type { VisitReview } from '@/shared/api/types'
import { Container } from '@/shared/ui/Container/Container'
import styles from './ReviewPage.module.css'

interface ReviewPageProps {
  bookingId: string
  signature: string | null
  /** The visit read on the server from the signed SMS link. */
  data: VisitReview | null
  error: string | null
}

// Opened from the «how was your visit?» SMS: the visit, five stars, a comment - nothing else.
// The visit arrives rendered from the server; only the rating form is interactive.
export const ReviewPage = ({ bookingId, signature, data, error }: ReviewPageProps) => {
  const [rated, setRated] = useState<number | null>(null)

  const visit = data?.visit
  const stars = rated ?? visit?.review?.rating ?? null

  return (
    <main className={styles.page}>
      <Container size='sm' className={styles.content}>
        {error && (
          <div className={styles.card}>
            <h1 className={styles.title}>The link did not open</h1>
            <p className={styles.text}>{error}</p>
            <NextLink href='/bookings' className={styles.link}>
              My bookings ›
            </NextLink>
          </div>
        )}

        {visit && (
          <div className={styles.card}>
            <div className={styles.visit}>
              <BusinessTile name={visit.business.name} size='lg' />
              <h1 className={styles.title}>{visit.business.name}</h1>
              <p className={styles.text}>
                {visit.serviceName} · {formatDayLong(visit.date)}, {visit.time}
              </p>
            </div>

            {stars !== null ? (
              <div className={styles.done}>
                <p
                  className={styles.doneStars}
                  role='img'
                  aria-label={`Your rating: ${stars} out of 5`}
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star key={value} weight={value <= stars ? 'fill' : 'regular'} aria-hidden />
                  ))}
                </p>
                <p className={styles.doneTitle}>
                  Thank you! Your review helps others choose a specialist.
                </p>
                {/* Liked the master → book them again in one tap; didn't → the same service,
                    another master. */}
                {stars >= 4 ? (
                  <ButtonLink
                    render={
                      <NextLink
                        href={`/${visit.business.slug}/book?service=${visit.serviceId}&specialist=${visit.specialistId}`}
                      />
                    }
                  >
                    Book {visit.specialistName.trim().split(/\s+/)[0]} again
                  </ButtonLink>
                ) : (
                  <ButtonLink
                    variant='secondary'
                    render={
                      <NextLink href={`/${visit.business.slug}/book?service=${visit.serviceId}`} />
                    }
                  >
                    Choose another specialist
                  </ButtonLink>
                )}
              </div>
            ) : data.canReview ? (
              <RateVisitForm
                bookingId={bookingId}
                access={{ signature }}
                specialistName={visit.specialistName}
                isPhotoFirst
                onRated={(review) => setRated(review.rating)}
              />
            ) : (
              <p className={styles.text}>
                {visit.status === 'cancelled'
                  ? 'This booking was cancelled: there is nothing to rate.'
                  : 'You can rate it after the visit.'}
              </p>
            )}
          </div>
        )}
      </Container>
    </main>
  )
}
