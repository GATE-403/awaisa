'use client'

import { plural } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { Star } from '@phosphor-icons/react/ssr'
import { useEffect, useState } from 'react'
import { ReviewItem } from '@/entities/review'
import { listPlaceReviews } from '@/shared/api/clientApi'
import type { ReviewSummary, Service } from '@/shared/api/types'
import { useFormat } from '@/shared/i18n'
import { MoreFade } from '@/shared/ui/MoreFade/MoreFade'
import styles from './PlaceReviews.module.css'

interface PlaceReviewsProps {
  slug: string
  businessName: string
  /** The chosen service: its own reviews first, the place's when it has none yet. */
  service: Service | null
}

type Loaded = { key: string; summary: ReviewSummary; isForService: boolean }

// While choosing, what people said decides it: reviews of this very service under the form as a
// thread - three, the last fading with "N more reviews" on it, which opens a few more right here
// (never a sheet over the booking, never a list that runs on and on).
const SHOWN = 3
const OPENED = 8
export const PlaceReviews = ({ slug, businessName, service }: PlaceReviewsProps) => {
  const { t } = useLingui()
  const format = useFormat()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [isOpen, setIsOpen] = useState(false)
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
          {t`Reviews`}
          {isForService && service && <span className={styles.about}> · {service.name}</span>}
        </h2>
      </div>
      <p className={styles.score}>
        <Star weight='fill' aria-hidden className={styles.star} />
        <strong>{format.number(summary.average)}</strong>
        {' · '}
        {t`${plural(summary.count, { one: '# review', other: '# reviews' })}`}
      </p>
      <MoreFade
        hiddenCount={Math.min(summary.items.length, OPENED) - SHOWN}
        isOpen={isOpen}
        isLessFloating={false}
        onToggle={() => setIsOpen((current) => !current)}
        label={t`${plural(Math.min(summary.items.length, OPENED) - SHOWN, { one: '# review', other: '# reviews' })}`
          .split(' ')
          .slice(1)
          .join(' ')}
      >
        <ul className={styles.list}>
          {summary.items.slice(0, isOpen ? OPENED : SHOWN).map((review) => (
            <ReviewItem key={review.id} review={review} businessName={businessName} />
          ))}
        </ul>
      </MoreFade>
    </section>
  )
}
