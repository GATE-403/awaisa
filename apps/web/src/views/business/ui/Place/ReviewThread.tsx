'use client'

import { useState } from 'react'
import { ReviewItem } from '@/entities/review'
import type { Business, Review } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { MoreFade } from '@/shared/ui/MoreFade/MoreFade'
import styles from './Place.module.css'

interface ReviewThreadProps {
  business: Business
  items: Review[]
}

const FIRST = 3

// Three reviews to read, the rest a tap away: the score card above already says how it splits.
export const ReviewThread = ({ business, items }: ReviewThreadProps) => {
  const t = useT()
  const [isAll, setIsAll] = useState(false)
  const shown = isAll ? items.length : FIRST
  const hidden = Math.max(0, items.length - FIRST)

  return (
    <>
      {/* While more wait, the last one fades into the page and the button sits on the fade. */}
      <MoreFade
        hiddenCount={hidden}
        isOpen={isAll}
        onToggle={() => setIsAll((value) => !value)}
        label={t.count(hidden, ['отзыв', 'отзыва', 'отзывов']).slice(String(hidden).length + 1)}
      >
        <ul className={styles.reviews}>
          {items.slice(0, shown).map((review) => (
            <ReviewItem
              key={review.id}
              review={review}
              businessName={business.name}
              authorHref={review.authorId ? `/u/${review.authorId}` : undefined}
            />
          ))}
        </ul>
      </MoreFade>
    </>
  )
}
