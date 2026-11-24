'use client'

import { Star } from '@phosphor-icons/react/ssr'
import { useEffect, useState } from 'react'
import { ReviewItem } from '@/entities/review'
import { getMasterReviews } from '@/shared/api/clientApi'
import type { MasterReviews as MasterReviewsData } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { MoreFade } from '@/shared/ui/MoreFade/MoreFade'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import styles from '../MasterDayPage.module.css'

interface MasterReviewsProps {
  slug: string
  businessName: string
}

const SHOWN = 3
const REVIEW_WORDS: [string, string] = ['review', 'reviews']

// What clients said about this master, under the day: the average and the latest reviews as the
// business page's thread, three and the rest behind «Ещё». Only their own reviews; nothing when
// there are none yet.
export const MasterReviews = ({ slug, businessName }: MasterReviewsProps) => {
  const t = useT()
  const [data, setData] = useState<MasterReviewsData | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    getMasterReviews(slug, controller.signal)
      .then(setData)
      .catch(() => undefined)

    return () => controller.abort()
  }, [slug])

  if (!data || data.count === 0) return null

  const shown = isOpen ? data.items : data.items.slice(0, SHOWN)
  const hiddenCount = isOpen ? data.items.length - SHOWN : data.items.length - shown.length

  return (
    <section className={styles.reviews} aria-label={t('Your reviews')}>
      <SectionCaption isInset={false} className={styles.reviewsCaption}>
        {t('Your reviews')}
        {data.average !== null && (
          <span className={styles.reviewsScore}>
            <Star weight='fill' aria-hidden />
            {data.average.toFixed(1).replace('.', ',')} · {t.count(data.count, REVIEW_WORDS)}
          </span>
        )}
      </SectionCaption>
      <MoreFade
        hiddenCount={Math.max(0, hiddenCount)}
        isOpen={isOpen}
        onToggle={() => setIsOpen((current) => !current)}
        label={t.count(Math.max(0, hiddenCount), REVIEW_WORDS).replace(/^\d+\s/, '')}
      >
        <ul className={styles.reviewList}>
          {shown.map((review) => (
            <ReviewItem
              key={review.id}
              review={review}
              businessName={businessName}
              meta={review.serviceName}
            />
          ))}
        </ul>
      </MoreFade>
    </section>
  )
}
