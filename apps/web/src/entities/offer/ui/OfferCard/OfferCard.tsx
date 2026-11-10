'use client'

import { Star } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import { addDayKey, formatDuration, formatPrice } from '@/entities/booking'
import { BusinessTile, pickTint, useNextFree } from '@/entities/business'
import type { Offer } from '@/shared/api/types'
import { useToday } from '@/shared/lib/hooks/useToday'
import styles from './OfferCard.module.css'

interface OfferCardProps {
  offer: Offer
  /** «Хит» marks the one most booked service of a place, so it keeps meaning in a feed. */
  isHit?: boolean
  /** Slot for a feature such as «в избранное» (FSD: entities don't import features). */
  action?: ReactNode
}

// A marketplace product card for a service: picture, price first, what and where, when you can come.
export const OfferCard = ({ offer, isHit = false, action }: OfferCardProps) => {
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
  const href = `/${offer.slug}/book?service=${offer.id}`

  return (
    <article className={styles.card} aria-label={`${offer.name}, ${offer.businessName}`}>
      <div
        className={styles.media}
        style={{ '--tint': pickTint(offer.businessName) } as CSSProperties}
      >
        {offer.coverUrl ? (
          // biome-ignore lint/performance/noImgElement: already resized WebP from our API
          <img src={offer.coverUrl} alt='' className={styles.cover} loading='lazy' />
        ) : (
          <BusinessTile name={offer.businessName} size='md' />
        )}
        {isHit && <span className={styles.badge}>Хит</span>}
      </div>
      {action && <span className={styles.action}>{action}</span>}

      <div className={styles.body}>
        <h3 className={styles.name}>
          {/* The whole card opens the booking through this link (stretched over the card). */}
          <NextLink href={href} className={styles.nameLink}>
            {offer.name}
          </NextLink>
        </h3>
        <p className={styles.place}>
          <BusinessTile name={offer.businessName} size='xs' />
          <span className={styles.placeName}>{offer.businessName}</span>
          {offer.rating !== null && (
            <span className={styles.rating}>
              <Star weight='fill' aria-hidden />
              {offer.rating.toFixed(1)}
            </span>
          )}
        </p>
        <div className={styles.footer}>
          <p className={styles.price}>
            {formatPrice(offer.price)}
            <span className={styles.duration}>{formatDuration(offer.durationMinutes)}</span>
          </p>
          <span
            className={styles.slot}
            data-state={slot && when ? (when === 'Сегодня' ? 'today' : 'soon') : 'none'}
          >
            {slot && when ? `${when}, ${slot.time}` : nextFree ? 'Нет окон рядом' : '\u00a0'}
          </span>
        </div>
      </div>
    </article>
  )
}
