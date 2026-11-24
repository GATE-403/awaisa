'use client'

import { Skeleton } from '@awaisa/ui/Skeleton'
import { useEffect, useState } from 'react'
import { ReviewItem } from '@/entities/review'
import { listPlaceReviews } from '@/shared/api/clientApi'
import type { FeedItem, ReviewSummary } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import styles from '../FeedPage.module.css'

interface WorkReviewsSheetProps {
  item: FeedItem
  onClose: () => void
}

// What people said about this very service with this master - read over the feed, like the
// comments under a reel, without leaving it.
export const WorkReviewsSheet = ({ item, onClose }: WorkReviewsSheetProps) => {
  const t = useT()
  const [summary, setSummary] = useState<ReviewSummary | null>(null)
  const { business, service, specialist } = item

  useEffect(() => {
    if (!service) return
    const controller = new AbortController()
    listPlaceReviews(
      business.slug,
      { serviceId: service.id, specialistId: specialist?.id, limit: 30 },
      controller.signal,
    )
      .then(setSummary)
      .catch(() => setSummary({ count: 0, average: 0, distribution: [], items: [] }))
    return () => controller.abort()
  }, [business.slug, service, specialist])

  return (
    <Sheet
      title={specialist ? `${t('Отзывы')} · ${specialist.name.split(' ')[0]}` : t('Отзывы')}
      cancelLabel={t('Готово')}
      onClose={onClose}
    >
      {!summary && <Skeleton className={styles.reviewsSkeleton} />}
      {summary && summary.count === 0 && (
        <p className={styles.reviewsEmpty}>
          {t('Об этой услуге ещё не писали - станьте первым после визита.')}
        </p>
      )}
      {summary && summary.count > 0 && (
        <ul className={styles.reviewsList}>
          {summary.items.map((review) => (
            <ReviewItem key={review.id} review={review} businessName={business.name} />
          ))}
        </ul>
      )}
    </Sheet>
  )
}
