'use client'

import { useLingui } from '@lingui/react/macro'
import { Check, EyeSlash, Prohibit, Trash } from '@phosphor-icons/react/ssr'
import { PersonAvatar } from '@/entities/business'
import { Stars } from '@/entities/review'
import type { ModerationAction, ModerationItem } from '@/shared/api/types'
import { Link as NextLink } from '@/shared/i18n/navigation'
import { GlyphButton, GlyphGroup } from '@/shared/ui/GlyphGroup/GlyphGroup'
import { describeItem, describeReasons } from '../lib/describe'
import styles from '../ModerationPage.module.css'

interface QueueItemProps {
  item: ModerationItem
  isPending: boolean
  onDecide: (action: ModerationAction) => void
}

// One reported thing as it looks on the site (the photo, the review's stars and words, the
// person's face and status), what was said about it, and the decisions as thin glyphs.
export const QueueItem = ({ item, isPending, onDecide }: QueueItemProps) => {
  const { t } = useLingui()
  const { preview } = item
  const title = preview?.title ?? t`Already deleted`

  return (
    <li className={styles.item} aria-busy={isPending}>
      {item.targetType !== 'photo' && preview ? (
        // People by their face; a review by its author's (a photo in it shows on the site).
        <PersonAvatar
          name={title}
          src={(item.targetType === 'profile' && preview.imageUrl) || undefined}
          className={styles.face}
        />
      ) : preview?.imageUrl ? (
        // biome-ignore lint/performance/noImgElement: a reported picture from any host, small.
        <img src={preview.imageUrl} alt='' className={styles.thumb} loading='lazy' />
      ) : (
        <span className={styles.thumb} aria-hidden />
      )}
      <div className={styles.itemBody}>
        <p className={styles.itemTitle}>
          {preview?.href ? (
            <NextLink href={preview.href} className={styles.itemLink} target='_blank'>
              {title}
            </NextLink>
          ) : (
            title
          )}
        </p>
        <p className={styles.meta}>{describeItem(item, t)}</p>
        {preview?.rating ? <Stars rating={preview.rating} /> : null}
        {preview?.text && item.targetType !== 'photo' && (
          <p className={styles.quote}>{preview.text}</p>
        )}
        <p className={styles.meta}>{describeReasons(item.reasons, t)}</p>
        {(item.isHidden || item.isKept) && (
          <p className={styles.state} data-state={item.isHidden ? 'hidden' : 'kept'}>
            {item.isHidden ? t`Hidden until you decide` : t`Kept before: won’t hide on its own`}
          </p>
        )}
      </div>
      <GlyphGroup label={t`Decision: ${title}`}>
        <GlyphButton
          icon={<Check aria-hidden />}
          label={t`Keep`}
          disabled={isPending}
          onClick={() => onDecide('keep')}
        />
        {preview && (
          <GlyphButton
            icon={<EyeSlash aria-hidden />}
            label={t`Hide`}
            disabled={isPending || item.isHidden}
            onClick={() => onDecide('hide')}
          />
        )}
        <GlyphButton
          icon={<Trash aria-hidden />}
          label={t`Delete`}
          disabled={isPending}
          onClick={() => onDecide('delete')}
        />
        {item.targetType === 'profile' && preview && (
          <GlyphButton
            icon={<Prohibit aria-hidden />}
            label={t`Block the author`}
            disabled={isPending}
            onClick={() => onDecide('block')}
          />
        )}
      </GlyphGroup>
    </li>
  )
}
