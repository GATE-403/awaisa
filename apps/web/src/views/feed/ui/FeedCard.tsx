'use client'

import { Heart } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { type CSSProperties, useRef, useState } from 'react'
import { formatDuration, formatPrice } from '@/entities/booking'
import { BusinessTile, PersonAvatar } from '@/entities/business'
import type { FeedItem } from '@/shared/api/types'
import styles from '../FeedPage.module.css'

interface FeedCardProps {
  item: FeedItem
  index: number
  /** Where the card lies: 0 in the middle, −1 / 1 tilted at the sides, 2 waiting unseen. */
  offset: number
  isLiked: boolean
  /** A double tap on the picture: likes it (never unlikes). */
  onDoubleTap: () => void
  /** A tap on a side card brings it to the middle. */
  onSelect: () => void
}

type Burst = { id: number; x: number; y: number }

// Two taps closer than this (in time and space) are a double tap; a drag is never one.
const DOUBLE_TAP_MS = 300
const TAP_SLOP = 12

const distanceText = (km: number | null) =>
  km === null ? '' : km < 1 ? ` · ${Math.round(km * 1000)} м` : ` · ${km} км`

// One look as a card of the hand: the picture is the card, who made it, the service and its price
// at its foot. The card in the middle is the one in play; the ones at the sides only peek.
export const FeedCard = ({
  item,
  index,
  offset,
  isLiked,
  onDoubleTap,
  onSelect,
}: FeedCardProps) => {
  const [bursts, setBursts] = useState<Burst[]>([])
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const { business, service, specialist } = item
  const isActive = offset === 0
  const masterHref = specialist
    ? `/${business.slug}/book?specialist=${specialist.id}`
    : `/${business.slug}`

  const handlePointerDown = (event: React.PointerEvent) => {
    pointerStart.current = { x: event.clientX, y: event.clientY }
  }

  const handlePointerUp = (event: React.PointerEvent) => {
    const start = pointerStart.current
    if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > TAP_SLOP) return
    if (!isActive) {
      onSelect()
      return
    }
    const now = performance.now()
    const previous = lastTap.current
    const rect = event.currentTarget.getBoundingClientRect()
    if (
      previous &&
      now - previous.time < DOUBLE_TAP_MS &&
      Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < 40
    ) {
      lastTap.current = null
      setBursts((current) => [
        ...current,
        { id: now, x: event.clientX - rect.left, y: event.clientY - rect.top },
      ])
      if (!isLiked) onDoubleTap()
      return
    }
    lastTap.current = { time: now, x: event.clientX, y: event.clientY }
  }

  return (
    <article
      className={styles.card}
      data-index={index}
      data-offset={offset}
      data-active={isActive || undefined}
      style={{ '--offset': offset } as CSSProperties}
      aria-posinset={index + 1}
      aria-setsize={-1}
      aria-hidden={isActive ? undefined : true}
      inert={!isActive}
      aria-label={service ? `${service.name}, ${business.name}` : business.name}
    >
      <div className={styles.media} onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}>
        {/* biome-ignore lint/performance/noImgElement: already resized WebP from our API */}
        <img
          src={item.url}
          alt={service ? `Работа: ${service.name}` : `Работа в ${business.name}`}
          className={styles.photo}
          loading='eager'
          decoding='async'
          draggable={false}
        />
        {isLiked && <Heart weight='fill' aria-hidden className={styles.likedMark} />}
        {bursts.map((burst) => (
          <Heart
            key={burst.id}
            weight='fill'
            aria-hidden
            className={styles.burst}
            style={{ left: burst.x, top: burst.y } as CSSProperties}
            onAnimationEnd={() =>
              setBursts((current) => current.filter((entry) => entry.id !== burst.id))
            }
          />
        ))}
      </div>

      <div className={styles.info}>
        {/* Who did it: the master's face books them, the place opens. */}
        <p className={styles.byline}>
          <NextLink
            href={masterHref}
            className={styles.bylineFace}
            aria-label={specialist ? `Записаться к мастеру ${specialist.name}` : business.name}
          >
            {specialist ? (
              <PersonAvatar
                name={specialist.name}
                src={specialist.photoUrl ?? undefined}
                size='sm'
              />
            ) : (
              <BusinessTile name={business.name} size='sm' />
            )}
          </NextLink>
          <span className={styles.bylineText}>
            {specialist && <strong>{specialist.name.split(' ')[0]}</strong>}
            {specialist && <span className={styles.metaDot}>·</span>}
            <NextLink href={`/${business.slug}`} className={styles.place}>
              {business.name}
              {distanceText(item.distanceKm)}
            </NextLink>
          </span>
        </p>
        {service && <h2 className={styles.service}>{service.name}</h2>}
        {service && (
          <p className={styles.meta}>
            <strong>{formatPrice(service.price)}</strong>
            <span className={styles.metaDot}>·</span>
            {formatDuration(service.durationMinutes)}
          </p>
        )}
      </div>
    </article>
  )
}
