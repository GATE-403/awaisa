'use client'

import { ph } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import type { ReactNode } from 'react'
import { BusinessTile, PersonAvatar } from '@/entities/business'
import type { Review } from '@/shared/api/types'
import { useFormat } from '@/shared/i18n'
import { Link as NextLink } from '@/shared/i18n/navigation'
import { Wreath } from '@/shared/ui/Wreath/Wreath'
import styles from './ReviewItem.module.css'
import { ReviewPhotos } from './ReviewPhotos'
import { Stars } from './Stars'

interface ReviewItemProps {
  review: Review
  businessName: string
  /** Under the name (the cabinet adds the phone, service and master). */
  meta?: ReactNode
  /** Beside the owner's reply, or in its place (the cabinet's «Reply» / «Edit»). */
  replyAction?: ReactNode
  /** Under the review's words: what the cabinet can do about it («Message client», «Resolved»). */
  actions?: ReactNode
  /** The author's public profile (`/u/<id>`): the name links to it. */
  authorHref?: string
  /** At the end of the name line: a quiet glyph for the viewer (the report flag). */
  headAction?: ReactNode
}

const DATE_OPTIONS: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }

// One review as a thread, the same on the business page and in the cabinet: the person's face,
// name and date on one line, stars, the words; the owner's reply hangs under it on a line from
// the author's face, with the place's own face and an «Reply» badge.
export const ReviewItem = ({
  review,
  businessName,
  meta,
  replyAction,
  actions,
  authorHref,
  headAction,
}: ReviewItemProps) => {
  const { t } = useLingui()
  const format = useFormat()

  return (
    <li className={styles.review}>
      <div className={styles.post} data-replied={review.reply || replyAction ? true : undefined}>
        {review.authorRank ? (
          // The platform's three most active clients: a laurel wreath around the face.
          <Wreath rank={review.authorRank} hasNumber={false}>
            <PersonAvatar
              name={review.authorName}
              src={review.authorAvatarUrl ?? undefined}
              size='sm'
              className={styles.face}
            />
          </Wreath>
        ) : (
          <PersonAvatar
            name={review.authorName}
            src={review.authorAvatarUrl ?? undefined}
            size='sm'
            className={styles.face}
          />
        )}
        <div className={styles.body}>
          <div className={styles.head}>
            {authorHref ? (
              <NextLink
                href={authorHref}
                className={styles.authorButton}
                aria-label={t`${ph({ name: review.authorName })}: profile`}
              >
                {review.authorName}
              </NextLink>
            ) : (
              <p className={styles.author}>{review.authorName}</p>
            )}
            <span className={styles.date}>{format.date(review.createdAt, DATE_OPTIONS)}</span>
            {headAction && <span className={styles.headAction}>{headAction}</span>}
          </div>
          <Stars rating={review.rating} />
          {meta && <div className={styles.meta}>{meta}</div>}
          {review.comment && <p className={styles.text}>{review.comment}</p>}
          {review.photos && review.photos.length > 0 && (
            <ReviewPhotos photos={review.photos} authorName={review.authorName} />
          )}
          {actions}
        </div>
      </div>
      {review.reply ? (
        <div className={styles.post} data-reply>
          <BusinessTile name={businessName} size='sm' className={styles.face} />
          <div className={styles.body}>
            <div className={styles.head}>
              <p className={styles.author}>
                {businessName}
                <span className={styles.badge}>{t`Reply`}</span>
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
}
