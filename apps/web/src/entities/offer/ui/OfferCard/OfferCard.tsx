'use client'

import { Fire, Star } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import { addDayKey, formatDuration, formatPrice } from '@/entities/booking'
import { BusinessTile, pickTint, useNextFree } from '@/entities/business'
import type { Offer } from '@/shared/api/types'
import { useToday } from '@/shared/lib/hooks/useToday'
import { sizedImage } from '@/shared/lib/imageSizes'
import styles from './OfferCard.module.css'

interface OfferCardProps {
  offer: Offer
  /** «Хит» marks the one most booked service of a place, so it keeps meaning in a feed. */
  isHit?: boolean
  /** Slot for a feature such as «в избранное» (FSD: entities don't import features). */
  action?: ReactNode
  /** On the place's own page: a link straight to a known free time, its label and that time. */
  href?: string
  linkLabel?: string
  slotText?: string
  /** On the place's own page the place's name and rating would repeat the page head. */
  isPlaceHidden?: boolean
}

// A marketplace product card for a service: picture, price first, what and where, when you can come.
export const OfferCard = ({
  offer,
  isHit = false,
  action,
  href: hrefOverride,
  linkLabel,
  slotText,
  isPlaceHidden = false,
}: OfferCardProps) => {
  const today = useToday()
  const nextFree = useNextFree()
  const slot = nextFree?.[offer.slug]
  const when =
    slot && today
      ? slot.date === today.dayKey
        ? 'Сегодня'
        : slot.date === addDayKey(today.dayKey, 1)
          ? 'Завтра'
          : null
      : null
  // The place's first free time (any service): open that day, the client picks the time.
  const href =
    hrefOverride ??
    `/${offer.slug}/book?service=${offer.id}${slot && when ? `&date=${slot.date}` : ''}`

  return (
    <article className={styles.card} aria-label={`${offer.name}, ${offer.businessName}`}>
      <div
        className={styles.media}
        style={{ '--tint': pickTint(offer.businessName) } as CSSProperties}
      >
        {offer.coverUrl ? (
          // biome-ignore lint/performance/noImgElement: already resized WebP from our API
          <img
            {...sizedImage(offer.coverUrl, 420)}
            alt=''
            className={styles.cover}
            loading='lazy'
            decoding='async'
          />
        ) : (
          <BusinessTile
            name={offer.businessName}
            logoUrl={offer.logoUrl}
            size='lg'
            className={styles.tile}
          />
        )}
        {offer.discountPercent ? (
          <span className={styles.discountBadge}>−{offer.discountPercent}%</span>
        ) : null}
        {isHit && (
          <span className={styles.badge} role='img' aria-label='Хит' title='Хит'>
            <Fire weight='fill' aria-hidden />
          </span>
        )}
      </div>
      {action && <span className={styles.action}>{action}</span>}

      <div className={styles.body}>
        <h3 className={styles.name}>
          {/* The whole card opens the booking through this link (stretched over the card). */}
          <NextLink href={href} className={styles.nameLink} aria-label={linkLabel}>
            {offer.name}
          </NextLink>
        </h3>
        {!isPlaceHidden && (
          <p className={styles.place}>
            <span className={styles.placeName}>{offer.businessName}</span>
            {offer.rating !== null && (
              <span className={styles.rating}>
                <Star weight='fill' aria-hidden />
                {offer.rating.toFixed(1)}
              </span>
            )}
          </p>
        )}
        <div className={styles.footer}>
          <p className={styles.price}>
            {formatPrice(offer.price)}
            <span className={styles.duration}> · {formatDuration(offer.durationMinutes)}</span>
          </p>
          <span
            className={styles.slot}
            data-state={
              slotText ? 'soon' : slot && when ? (when === 'Сегодня' ? 'today' : 'soon') : 'none'
            }
          >
            {slotText ??
              (slot && when ? `${when} с ${slot.time}` : nextFree ? 'Нет окон рядом' : '\u00a0')}
          </span>
        </div>
      </div>
    </article>
  )
}
