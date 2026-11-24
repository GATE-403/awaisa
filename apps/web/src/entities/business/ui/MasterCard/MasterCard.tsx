import { Star } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import type { Specialist } from '@/shared/api/types'
import { sizedImage } from '@/shared/lib/imageSizes'
import { Mascot } from '@/shared/ui/Mascot/Mascot'
import { WreathBadge } from '@/shared/ui/Wreath/Wreath'
import { pickTint } from '../BusinessTile/BusinessTile'
import styles from './MasterCard.module.css'

type MasterCardPerson = Pick<Specialist, 'name' | 'photoUrl' | 'rank' | 'rating' | 'role'>

interface MasterCardProps {
  /** The master; null draws the neutral «any master» card with `icon`, `title` and `meta`. */
  specialist: MasterCardPerson | null
  /** A link card (the business page); without it the card is a `<label>` for `children`. */
  href?: string
  className?: string
  /** Inside a picker: the native radio covering the card and its check badge. */
  children?: ReactNode
  icon?: ReactNode
  title?: string
  /** The line under the name; a master's own card says ★ rating · role unless this is given
   * (a profile's masters say «4 visits · 3 wk ago»). */
  meta?: ReactNode
  /** The picture's width in CSS px, for the sized `srcSet`. */
  imageWidth?: number
  /** In the cabinet: the card is a button that opens the master's sheet. */
  onSelect?: () => void
}

// A master as a 3:4 picture card - the photo, or the white mascot on their own colour - with
// the first name and ★ rating · role on a scrim. One card for the business page («Specialists») and
// the booking form's master step, so the face picked there is the one seen here.
export const MasterCard = ({
  specialist,
  href,
  className,
  children,
  icon,
  title,
  meta,
  imageWidth = 180,
  onSelect,
}: MasterCardProps) => {
  const cardClass = className ? `${styles.card} ${className}` : styles.card
  const body = (
    <>
      {specialist?.photoUrl ? (
        // biome-ignore lint/performance/noImgElement: already resized WebP from our API
        <img
          {...sizedImage(specialist.photoUrl, imageWidth)}
          alt=''
          className={styles.photo}
          data-card-media=''
          loading='lazy'
          decoding='async'
        />
      ) : (
        <span className={styles.mark} aria-hidden>
          {specialist ? <Mascot /> : icon}
        </span>
      )}
      {specialist?.rank && <WreathBadge rank={specialist.rank} className={styles.wreath} />}
      <span className={styles.caption}>
        <span className={styles.name}>{specialist ? specialist.name.split(' ')[0] : title}</span>
        <span className={styles.meta}>
          {specialist && !meta ? (
            <>
              {specialist.rating !== null && (
                <span className={styles.rating}>
                  <Star weight='fill' aria-hidden />
                  {specialist.rating.toFixed(1)}
                </span>
              )}
              {specialist.role}
            </>
          ) : (
            meta
          )}
        </span>
      </span>
      {/* The card shows the first name; the full one is read after what is written on it, so
          the name still contains the visible text (WCAG 2.5.3) and voice control finds it. */}
      {specialist?.name.includes(' ') && (
        <span className={styles.srOnly}>{`, ${specialist.name}`}</span>
      )}
      {children}
    </>
  )
  const props = {
    className: cardClass,
    'data-card': '',
    'data-any': specialist ? undefined : '',
    'data-picture-frame': specialist?.photoUrl ? '' : undefined,
    style: specialist ? ({ '--tint': pickTint(specialist.name) } as CSSProperties) : undefined,
  }

  if (onSelect) {
    return (
      <button type='button' {...props} data-button='' onClick={onSelect}>
        {body}
      </button>
    )
  }

  return href ? (
    <NextLink href={href} {...props}>
      {body}
    </NextLink>
  ) : (
    // The picker's native radio comes in as `children`, inside the label.
    // biome-ignore lint/a11y/noLabelWithoutControl: the control is passed in as children
    <label {...props}>{body}</label>
  )
}

export type { MasterCardPerson }
