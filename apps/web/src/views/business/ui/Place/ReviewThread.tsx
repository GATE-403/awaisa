'use client'

import { ph, plural } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { useState } from 'react'
import { ReviewItem } from '@/entities/review'
import { ReportMenu } from '@/features/report'
import type { Business, Review } from '@/shared/api/types'
import { MoreFade } from '@/shared/ui/MoreFade/MoreFade'
import styles from './Place.module.css'

interface ReviewThreadProps {
  business: Business
  items: Review[]
}

const FIRST = 3

// Three reviews to read, the rest a tap away: the score card above already says how it splits.
export const ReviewThread = ({ business, items }: ReviewThreadProps) => {
  const { t } = useLingui()
  const [isAll, setIsAll] = useState(false)
  // A reported review leaves the thread at once for whoever reported it.
  const [reported, setReported] = useState<string[]>([])
  const visible = items.filter((review) => !reported.includes(review.id))
  const shown = isAll ? visible.length : FIRST
  const hidden = Math.max(0, visible.length - FIRST)

  return (
    <>
      {/* While more wait, the last one fades into the page and the button sits on the fade. */}
      <MoreFade
        hiddenCount={hidden}
        isOpen={isAll}
        onToggle={() => setIsAll((value) => !value)}
        label={t`${plural(hidden, { one: '# review', other: '# reviews' })}`.slice(
          String(hidden).length + 1,
        )}
      >
        <ul className={styles.reviews}>
          {visible.slice(0, shown).map((review) => (
            <ReviewItem
              key={review.id}
              review={review}
              businessName={business.name}
              authorHref={review.authorId ? `/u/${review.authorId}` : undefined}
              headAction={
                <ReportMenu
                  targetType='review'
                  targetId={review.id}
                  label={t`Report review: ${ph({ name: review.authorName })}`}
                  onReported={() => setReported((ids) => [...ids, review.id])}
                />
              }
            />
          ))}
        </ul>
      </MoreFade>
    </>
  )
}
