'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import { Skeleton } from '@awaisa/ui/Skeleton'
import { Star } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { formatDayLong } from '@/entities/booking'
import { BusinessTile } from '@/entities/business'
import { RateVisitForm } from '@/features/rateVisit'
import { getErrorMessage } from '@/shared/api/apiError'
import { getVisitReview } from '@/shared/api/clientApi'
import type { VisitReview } from '@/shared/api/types'
import { Container } from '@/shared/ui/Container/Container'
import styles from './ReviewPage.module.css'

interface ReviewPageProps {
  bookingId: string
}

// Opened from the «как прошёл визит?» SMS: the visit, five stars, a comment — nothing else.
export const ReviewPage = ({ bookingId }: ReviewPageProps) => {
  const searchParams = useSearchParams()
  const signature = searchParams.get('s')
  const [data, setData] = useState<VisitReview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rated, setRated] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    getVisitReview(bookingId, { signature }, controller.signal)
      .then(setData)
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) setError(getErrorMessage(loadError))
      })

    return () => controller.abort()
  }, [bookingId, signature])

  const visit = data?.visit
  const stars = rated ?? visit?.review?.rating ?? null

  return (
    <main className={styles.page}>
      <Container size='sm' className={styles.content}>
        {error && (
          <div className={styles.card}>
            <h1 className={styles.title}>Ссылка не открылась</h1>
            <p className={styles.text}>{error}</p>
            <NextLink href='/bookings' className={styles.link}>
              Мои записи ›
            </NextLink>
          </div>
        )}
        {!data && !error && <Skeleton className={styles.skeleton} />}

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
                  aria-label={`Ваша оценка: ${stars} из 5`}
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star key={value} weight={value <= stars ? 'fill' : 'regular'} aria-hidden />
                  ))}
                </p>
                <p className={styles.doneTitle}>Спасибо! Отзыв помогает другим выбрать мастера.</p>
                <ButtonLink
                  render={
                    <NextLink
                      href={`/${visit.business.slug}/book?service=${visit.serviceId}&specialist=${visit.specialistId}`}
                    />
                  }
                >
                  Записаться снова
                </ButtonLink>
              </div>
            ) : data.canReview ? (
              <RateVisitForm
                bookingId={bookingId}
                access={{ signature }}
                specialistName={visit.specialistName}
                onRated={(review) => setRated(review.rating)}
              />
            ) : (
              <p className={styles.text}>
                {visit.status === 'cancelled'
                  ? 'Эта запись отменена — оценивать нечего.'
                  : 'Оценить можно после визита.'}
              </p>
            )}
          </div>
        )}
      </Container>
    </main>
  )
}
