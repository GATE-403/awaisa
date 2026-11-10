import { Star } from '@phosphor-icons/react/ssr'
import type { Business, ReviewSummary } from '@/shared/api/types'
import { pluralize } from '@/shared/lib/plural'
import styles from './Place.module.css'

interface ReviewsSectionProps {
  business: Business
  reviews: ReviewSummary
}

const dateFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })

// Real reviews after real visits: the score and how it splits, then what people wrote.
export const ReviewsSection = ({ business, reviews }: ReviewsSectionProps) => {
  if (reviews.count === 0) return null
  const max = Math.max(1, ...reviews.distribution.map((row) => row.count))

  return (
    <section id='reviews' className={styles.section} aria-labelledby='place-reviews'>
      <div className={styles.sectionHead}>
        <h2 id='place-reviews' className={styles.sectionTitle}>
          Отзывы
        </h2>
      </div>
      <div className={styles.reviewSummary}>
        <div className={styles.reviewScore}>
          <span className={styles.reviewAverage}>{reviews.average.toFixed(1)}</span>
          <span className={styles.reviewOutOf}>из 5</span>
        </div>
        <div className={styles.reviewBars}>
          {reviews.distribution.map((row) => (
            <div key={row.stars} className={styles.reviewBar}>
              <span className={styles.reviewBarStars} aria-hidden='true'>
                {'★'.repeat(row.stars)}
              </span>
              <span className={styles.reviewTrack} aria-hidden='true'>
                <span style={{ width: `${(row.count / max) * 100}%` }} />
              </span>
              <span className={styles.srOnly}>
                {row.stars} звезды: {row.count}
              </span>
            </div>
          ))}
          <span className={styles.reviewCount}>
            {pluralize(reviews.count, ['оценка', 'оценки', 'оценок'])}
          </span>
        </div>
      </div>
      <ul className={styles.reviews}>
        {reviews.items.map((review) => (
          <li key={review.id} className={styles.review}>
            <div className={styles.reviewHead}>
              <span className={styles.reviewStars} role='img' aria-label={`${review.rating} из 5`}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <Star
                    key={value}
                    weight={value <= review.rating ? 'fill' : 'regular'}
                    aria-hidden
                  />
                ))}
              </span>
              <span className={styles.reviewDate}>
                {dateFormatter.format(new Date(review.createdAt))}
              </span>
            </div>
            <p className={styles.reviewAuthor}>
              {review.authorName}
              <span className={styles.reviewMeta}>
                {' '}
                · {review.serviceName}, мастер {review.specialistName}
              </span>
            </p>
            {review.comment && <p className={styles.reviewText}>{review.comment}</p>}
            {review.reply && (
              <div className={styles.reviewReply}>
                <p className={styles.reviewReplyTitle}>Ответ {business.name}</p>
                <p className={styles.reviewText}>{review.reply}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
