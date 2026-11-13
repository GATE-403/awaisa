import type { ReactNode } from 'react'
import { BusinessTile, PersonAvatar } from '@/entities/business'
import type { Review } from '@/shared/api/types'
import styles from './ReviewItem.module.css'
import { Stars } from './Stars'

interface ReviewItemProps {
  review: Review
  businessName: string
  /** Under the name (the cabinet adds the phone, service and master). */
  meta?: ReactNode
  /** Beside the owner's reply, or in its place (the cabinet's «Ответить» / «Изменить»). */
  replyAction?: ReactNode
}

const dateFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })

// One review as a thread, the same on the business page and in the cabinet: the person's face,
// name and date on one line, stars, the words; the owner's reply hangs under it on a line from
// the author's face, with the place's own face and an «Ответ» badge.
export const ReviewItem = ({ review, businessName, meta, replyAction }: ReviewItemProps) => (
  <li className={styles.review}>
    <div className={styles.post} data-replied={review.reply || replyAction ? true : undefined}>
      <PersonAvatar name={review.authorName} size='sm' className={styles.face} />
      <div className={styles.body}>
        <div className={styles.head}>
          <p className={styles.author}>{review.authorName}</p>
          <span className={styles.date}>{dateFormatter.format(new Date(review.createdAt))}</span>
        </div>
        <Stars rating={review.rating} />
        {meta && <div className={styles.meta}>{meta}</div>}
        {review.comment && <p className={styles.text}>{review.comment}</p>}
      </div>
    </div>
    {review.reply ? (
      <div className={styles.post} data-reply>
        <BusinessTile name={businessName} size='sm' className={styles.face} />
        <div className={styles.body}>
          <div className={styles.head}>
            <p className={styles.author}>
              {businessName}
              <span className={styles.badge}>Ответ</span>
            </p>
            {replyAction}
          </div>
          <p className={styles.text}>{review.reply}</p>
        </div>
      </div>
    ) : (
      replyAction && (
        <div className={styles.post} data-reply>
          <BusinessTile name={businessName} size='sm' className={styles.face} />
          <div className={styles.body}>{replyAction}</div>
        </div>
      )
    )}
  </li>
)
