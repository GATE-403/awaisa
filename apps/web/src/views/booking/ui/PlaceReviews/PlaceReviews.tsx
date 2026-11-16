'use client'

import { Star } from '@phosphor-icons/react/ssr'
import { useEffect, useState } from 'react'
import { PersonAvatar } from '@/entities/business'
import { Stars } from '@/entities/review'
import { listPlaceReviews } from '@/shared/api/clientApi'
import type { ReviewSummary, Service } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { BUSINESS_TIME_ZONE } from '@/shared/lib/businessTime'
import styles from './PlaceReviews.module.css'

interface PlaceReviewsProps {
  slug: string
  businessName: string
  /** The chosen service: its own reviews first, the place's when it has none yet. */
  service: Service | null
}

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  timeZone: BUSINESS_TIME_ZONE,
})

type Loaded = { key: string; summary: ReviewSummary; isForService: boolean }

// While choosing, what people said decides it: reviews of this very service under the form, as a
// sideways row of short cards (like an app store's) — the page never grows long and nothing opens
// over the booking; a tap on a card shows its whole text in place.
export const PlaceReviews = ({ slug, businessName, service }: PlaceReviewsProps) => {
  const t = useT()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const serviceId = service?.id
  const key = `${slug}|${serviceId ?? ''}`

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      if (serviceId) {
        const own = await listPlaceReviews(slug, { serviceId, limit: 20 }, controller.signal)
        if (own.count > 0) return setLoaded({ key, summary: own, isForService: true })
      }
      const all = await listPlaceReviews(slug, { limit: 20 }, controller.signal)
      setLoaded({ key, summary: all, isForService: false })
    }
    load().catch(() => undefined)
    return () => controller.abort()
  }, [slug, serviceId, key])

  // The last answer stays on screen while the next service's reviews load: no jump.
  if (!loaded || loaded.summary.count === 0) return null
  const { summary, isForService } = loaded

  return (
    <section className={styles.reviews} aria-labelledby='booking-reviews'>
      <div className={styles.head}>
        <h2 id='booking-reviews' className={styles.title}>
          {t('Отзывы')}
          {isForService && service && <span className={styles.about}> · {service.name}</span>}
        </h2>
      </div>
      <p className={styles.score}>
        <Star weight='fill' aria-hidden className={styles.star} />
        <strong>{summary.average.toLocaleString('ru-RU')}</strong>
        {' · '}
        {t.count(summary.count, ['отзыв', 'отзыва', 'отзывов'])}
      </p>
      <ul className={styles.row} data-edge-fade=''>
        {/* The ones with words first: a row opening on bare stars says little. */}
        {[...summary.items]
          .sort((first, second) => Number(Boolean(second.comment)) - Number(Boolean(first.comment)))
          .map((review) => {
            const isOpen = openId === review.id
            return (
              <li key={review.id} className={styles.card} data-open={isOpen || undefined}>
                <div className={styles.cardHead}>
                  <PersonAvatar
                    name={review.authorName}
                    src={review.authorAvatarUrl ?? undefined}
                    size='sm'
                  />
                  <span className={styles.author}>{review.authorName}</span>
                  <span className={styles.date}>
                    {dateFormatter.format(new Date(review.createdAt))}
                  </span>
                </div>
                <Stars rating={review.rating} />
                {review.comment && <p className={styles.text}>{review.comment}</p>}
                {review.reply && (
                  <p className={styles.reply}>
                    <strong>{businessName}:</strong> {review.reply}
                  </p>
                )}
                {(review.comment.length > 110 || Boolean(review.reply)) && (
                  <button
                    type='button'
                    className={styles.more}
                    aria-expanded={isOpen}
                    onClick={() => setOpenId(isOpen ? null : review.id)}
                  >
                    {isOpen ? t('Свернуть') : t('Читать целиком')}
                  </button>
                )}
              </li>
            )
          })}
      </ul>
    </section>
  )
}
