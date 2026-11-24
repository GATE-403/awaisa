import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { Star } from '@phosphor-icons/react/ssr'
import type { Business, ReviewSummary } from '@/shared/api/types'
import { makeFormat } from '@/shared/i18n/format'
import styles from './Place.module.css'
import { ReviewThread } from './ReviewThread'

interface ReviewsSectionProps {
  business: Business
  reviews: ReviewSummary
}

// Real reviews after real visits: the score and how it splits, then what people wrote.
export const ReviewsSection = ({ business, reviews }: ReviewsSectionProps) => {
  const { t, i18n } = useLingui()
  const format = makeFormat(i18n)

  if (reviews.count === 0) return null

  return (
    <section id='reviews' className={styles.section} aria-labelledby='place-reviews'>
      <div className={styles.sectionHead}>
        <h2 id='place-reviews' className={styles.sectionTitle}>
          <Trans>Reviews</Trans>
        </h2>
        <span className={styles.sectionCount}>
          <Trans>latest {reviews.items.length}</Trans>
        </span>
      </div>
      {/* The score first, like an app's ratings: the average large, how it splits by stars. */}
      <div className={styles.reviewSummary}>
        <div className={styles.reviewScore}>
          <span className={styles.reviewAverage}>{format.rating(reviews.average)}</span>
          <span
            className={styles.reviewStars}
            role='img'
            aria-label={t`${format.rating(reviews.average)} out of 5`}
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <Star
                key={value}
                weight={value <= Math.round(reviews.average) ? 'fill' : 'regular'}
                aria-hidden
              />
            ))}
          </span>
          <span className={styles.reviewTotal}>
            <Plural value={reviews.count} one='# rating' other='# ratings' />
          </span>
        </div>
        <ul className={styles.reviewBars} aria-label={t`How the ratings split`}>
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = reviews.distribution.find((item) => item.stars === stars)?.count ?? 0
            const share = reviews.count > 0 ? (count / reviews.count) * 100 : 0
            return (
              <li key={stars} className={styles.reviewBar}>
                <span className={styles.reviewBarLabel}>{stars}</span>
                <span className={styles.reviewBarTrack} aria-hidden>
                  <span className={styles.reviewBarFill} style={{ width: `${share}%` }} />
                </span>
                <span className={styles.reviewBarCount}>
                  {Math.round(share)}%<span className={styles.srOnly}> - {count}</span>
                </span>
              </li>
            )
          })}
        </ul>
      </div>
      {/* A thread like comments in a social app: a face, the name and date on one line, the
          words; the owner's reply hangs under it on a line from the author's face. */}
      <ReviewThread business={business} items={reviews.items} />
    </section>
  )
}
