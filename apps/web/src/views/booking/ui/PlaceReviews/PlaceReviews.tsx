'use client'

import { Star } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useEffect, useState } from 'react'
import { ReviewItem } from '@/entities/review'
import { listPlaceReviews } from '@/shared/api/clientApi'
import type { ReviewSummary, Service } from '@/shared/api/types'
import { pluralize } from '@/shared/lib/plural'
import styles from './PlaceReviews.module.css'

interface PlaceReviewsProps {
  slug: string
  businessName: string
  /** The chosen service: its own reviews first, the place's when it has none yet. */
  service: Service | null
}

type Loaded = { key: string; summary: ReviewSummary; isForService: boolean }

// While choosing, what people said decides it: three reviews of this very service under the form.
export const PlaceReviews = ({ slug, businessName, service }: PlaceReviewsProps) => {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const serviceId = service?.id
  const key = `${slug}|${serviceId ?? ''}`

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      if (serviceId) {
        const own = await listPlaceReviews(slug, { serviceId }, controller.signal)
        if (own.count > 0) return setLoaded({ key, summary: own, isForService: true })
      }
      const all = await listPlaceReviews(slug, {}, controller.signal)
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
          Отзывы
          {isForService && service && <span className={styles.about}> · {service.name}</span>}
        </h2>
        <NextLink href={`/${slug}#reviews`} className={styles.all}>
          Все ›
        </NextLink>
      </div>
      <p className={styles.score}>
        <Star weight='fill' aria-hidden className={styles.star} />
        <strong>{summary.average.toLocaleString('ru-RU')}</strong>
        {' · '}
        {pluralize(summary.count, ['отзыв', 'отзыва', 'отзывов'])}
      </p>
      <ul className={styles.list}>
        {summary.items.slice(0, 3).map((review) => (
          <ReviewItem
            key={review.id}
            review={review}
            businessName={businessName}
            authorHref={review.authorId ? `/u/${review.authorId}` : undefined}
          />
        ))}
      </ul>
    </section>
  )
}
