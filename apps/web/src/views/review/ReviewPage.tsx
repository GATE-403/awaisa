'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import { Trans, useLingui } from '@lingui/react/macro'
import { Star } from '@phosphor-icons/react/ssr'
import { useState } from 'react'
import { BusinessTile } from '@/entities/business'
import { RateVisitForm } from '@/features/rateVisit'
import type { VisitReview } from '@/shared/api/types'
import { Link as NextLink } from '@/shared/i18n/navigation'
import { useFormat } from '@/shared/i18n/useFormat'
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
  const { t } = useLingui()
  const format = useFormat()
  const [rated, setRated] = useState<number | null>(null)

  const visit = data?.visit
  const firstName = visit?.specialistName.trim().split(/\s+/)[0] ?? ''
  const stars = rated ?? visit?.review?.rating ?? null

  return (
    <main className={styles.page}>
      <Container size='sm' className={styles.content}>
        {error && (
          <div className={styles.card}>
            <h1 className={styles.title}>
              <Trans>The link did not open</Trans>
            </h1>
            <p className={styles.text}>{error}</p>
            <NextLink href='/bookings' className={styles.link}>
              <Trans>My bookings ›</Trans>
            </NextLink>
          </div>
        )}

        {visit && (
          <div className={styles.card}>
            <div className={styles.visit}>
              <BusinessTile name={visit.business.name} size='lg' />
              <h1 className={styles.title}>{visit.business.name}</h1>
              <p className={styles.text}>
                {visit.serviceName} · {format.dayLong(visit.date)}, {visit.time}
              </p>
            </div>

            {stars !== null ? (
              <div className={styles.done}>
                <p
                  className={styles.doneStars}
                  role='img'
                  aria-label={t`Your rating: ${stars} out of 5`}
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star key={value} weight={value <= stars ? 'fill' : 'regular'} aria-hidden />
                  ))}
                </p>
                <p className={styles.doneTitle}>
                  <Trans>Thank you! Your review helps others choose a specialist.</Trans>
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
                    <Trans>Book {firstName} again</Trans>
                  </ButtonLink>
                ) : (
                  <ButtonLink
                    variant='secondary'
                    render={
                      <NextLink href={`/${visit.business.slug}/book?service=${visit.serviceId}`} />
                    }
                  >
                    <Trans>Choose another specialist</Trans>
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
                  ? t`This booking was cancelled: there is nothing to rate.`
                  : t`You can rate it after the visit.`}
              </p>
            )}
          </div>
        )}
      </Container>
    </main>
  )
}
