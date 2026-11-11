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

  return (
    <section id='reviews' className={styles.section} aria-labelledby='place-reviews'>
      <div className={styles.sectionHead}>
        <h2 id='place-reviews' className={styles.sectionTitle}>
          Отзывы
        </h2>
        <span className={styles.sectionCount}>
          ★ {reviews.average.toFixed(1)} ·{' '}
          {pluralize(reviews.count, ['оценка', 'оценки', 'оценок'])}
        </span>
      </div>
      <ul className={styles.reviews}>
        {reviews.items.map((review) => (
          <li key={review.id} className={styles.review}>
            <div className={styles.reviewHead}>
              <p className={styles.reviewAuthor}>{review.authorName}</p>
              <span className={styles.reviewDate}>
                {dateFormatter.format(new Date(review.createdAt))}
              </span>
            </div>
            <span className={styles.reviewStars} role='img' aria-label={`${review.rating} из 5`}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Star
                  key={value}
                  weight={value <= review.rating ? 'fill' : 'regular'}
                  aria-hidden
                />
              ))}
            </span>
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
