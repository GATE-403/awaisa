'use client'

import { plural } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { useState } from 'react'
import { BusinessTile } from '@/entities/business'
import { ReviewPhotos, Stars } from '@/entities/review'
import type { PublicProfile } from '@/shared/api/types'
import { useFormat } from '@/shared/i18n'
import { Link as NextLink } from '@/shared/i18n/navigation'
import { MoreFade } from '@/shared/ui/MoreFade/MoreFade'
import styles from '../ProfilePage.module.css'

interface ProfileReviewsProps {
  reviews: PublicProfile['reviews']
  authorName: string
}

const FIRST = 3
const DATE_OPTIONS: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }

// Three reviews as a thread on the page, the rest behind «N more» on a fade.
export const ProfileReviews = ({ reviews, authorName }: ProfileReviewsProps) => {
  const { t } = useLingui()
  const format = useFormat()
  const [isAll, setIsAll] = useState(false)
  const hidden = Math.max(0, reviews.length - FIRST)

  return (
    <MoreFade
      hiddenCount={hidden}
      isOpen={isAll}
      onToggle={() => setIsAll((value) => !value)}
      label={t`${plural(hidden, { one: '# review', other: '# reviews' })}`.replace(/^\d+ /, '')}
    >
      <ul className={styles.reviews}>
        {reviews.slice(0, isAll ? reviews.length : FIRST).map((review) => (
          <li key={review.id} className={styles.review}>
            <NextLink href={`/${review.business.slug}`} className={styles.reviewPlace}>
              <BusinessTile
                name={review.business.name}
                logoUrl={review.business.logoUrl}
                size='sm'
              />
              <span className={styles.reviewPlaceName}>{review.business.name}</span>
              <span className={styles.reviewDate}>
                {format.date(review.createdAt, DATE_OPTIONS)}
              </span>
            </NextLink>
            <div className={styles.reviewBody}>
              <div className={styles.reviewMeta}>
                <Stars rating={review.rating} />
                {review.serviceName}
              </div>
              {review.comment && <p className={styles.reviewText}>{review.comment}</p>}
              {review.photos && review.photos.length > 0 && (
                <ReviewPhotos photos={review.photos} authorName={authorName} />
              )}
            </div>
          </li>
        ))}
      </ul>
    </MoreFade>
  )
}
