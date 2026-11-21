'use client'

import { Fire, Star } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import { addDayKey, formatPrice } from '@/entities/booking'
import { BusinessTile, pickTint, useNextFree } from '@/entities/business'
import type { Offer } from '@/shared/api/types'
import { useToday } from '@/shared/lib/hooks/useToday'
import { gridImage } from '@/shared/lib/imageSizes'
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
  /** One of the first cards on screen: its picture loads at once, not lazily. */
  isPriority?: boolean
  /** What the capsule at the foot says a tap does: «Записаться», or «Изменить» in the cabinet. */
  actionLabel?: string
  /** In the cabinet: the card is a button that opens the service's sheet, not a link. */
  onSelect?: () => void
}

// A service card: the service, where (the place's name), the price and when — and «Записаться» on
// it, so it is never taken for a place card (those show a logo, rating and the number of services).
export const OfferCard = ({
  offer,
  isHit = false,
  action,
  href: hrefOverride,
  linkLabel,
  slotText,
  isPlaceHidden = false,
  isPriority = false,
  actionLabel = 'Записаться',
  onSelect,
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
    <article
      className={styles.card}
      data-card=''
      aria-label={`${offer.name}, ${offer.businessName}`}
    >
      <div
        className={styles.media}
        data-picture-frame={offer.coverUrl ? '' : undefined}
        style={{ '--tint': pickTint(offer.businessName) } as CSSProperties}
      >
        {offer.coverUrl ? (
          // biome-ignore lint/performance/noImgElement: already resized WebP from our API
          <img
            {...gridImage(offer.coverUrl)}
            alt=''
            className={styles.cover}
            data-card-media=''
            loading={isPriority ? 'eager' : 'lazy'}
            fetchPriority={isPriority ? 'high' : undefined}
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
          {onSelect ? (
            <button
              type='button'
              className={`${styles.nameLink} ${styles.nameButton}`}
              aria-label={linkLabel}
              onClick={onSelect}
            >
              {offer.name}
            </button>
          ) : (
            <NextLink href={href} className={styles.nameLink} aria-label={linkLabel}>
              {offer.name}
            </NextLink>
          )}
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
          <p className={styles.price}>{formatPrice(offer.price)}</p>
          {/* Less on the picture: the length is in the booking form, and only a time today is
              worth a line here («Завтра» and «Нет окон рядом» said little and crowded it). */}
          {(slotText || (slot && when === 'Сегодня')) && (
            <span className={styles.slot} data-state={slotText ? 'soon' : 'today'}>
              {slotText ?? `Сегодня с ${slot?.time}`}
            </span>
          )}
        </div>
        {/* What a tap does, said on the card: a service books, a place card opens the place. */}
        <span className={styles.book} aria-hidden>
          {actionLabel}
        </span>
      </div>
    </article>
  )
}
