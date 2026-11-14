'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import { Menu, MenuItem } from '@awaisa/ui/Menu'
import { useToast } from '@awaisa/ui/Toast'
import { ChatCircle, DotsThree, Flag, Heart, ShareFat } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { type CSSProperties, useRef, useState } from 'react'
import { formatDuration, formatPrice, useNextSlot } from '@/entities/booking'
import { BusinessTile, PersonAvatar } from '@/entities/business'
import { useFavorites } from '@/features/favorites'
import { reportFeedItem } from '@/shared/api/clientApi'
import type { FeedItem } from '@/shared/api/types'
import { haptic } from '@/shared/lib/nativeBridge'
import styles from '../FeedPage.module.css'
import { WorkReviewsSheet } from './WorkReviewsSheet'

interface FeedCardProps {
  item: FeedItem
  index: number
  /** Fills the screen: the photo drifts and the free time is looked up. */
  isActive: boolean
  /** The active card or a neighbour: its photo loads eagerly. */
  isNear: boolean
  isLiked: boolean
  onLike: (isLiked: boolean) => void
}

type Burst = { id: number; x: number; y: number }

const ANY = 'any'
// Two taps closer than this (in time and space) are a double tap; a drag is never one.
const DOUBLE_TAP_MS = 300
const TAP_SLOP = 12

const compact = (count: number) =>
  count >= 1000
    ? `${(count / 1000).toFixed(1).replace('.', ',').replace(',0', '')} тыс.`
    : `${count}`

const distanceText = (km: number | null) =>
  km === null ? '' : km < 1 ? ` · ${Math.round(km * 1000)} м` : ` · ${km} км`

export const FeedCard = ({ item, index, isActive, isNear, isLiked, onLike }: FeedCardProps) => {
  const toast = useToast()
  const favorites = useFavorites()
  const [isReported, setIsReported] = useState(false)
  const [isReviewsOpen, setIsReviewsOpen] = useState(false)
  const [bursts, setBursts] = useState<Burst[]>([])
  // The cached feed may not include this device's like yet: count it once, on top.
  const [wasLiked] = useState(isLiked)
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const { business, service, specialist } = item
  const likes = (item.likes ?? 0) + (isLiked === wasLiked ? 0 : isLiked ? 1 : -1)
  const slot = useNextSlot(service?.id ?? null, {
    specialistId: specialist?.id ?? ANY,
    isEnabled: isNear,
  })
  const bookParams = new URLSearchParams(
    service
      ? {
          service: service.id,
          specialist: specialist?.id ?? ANY,
          ...(slot ? { date: slot.date, time: slot.time } : {}),
        }
      : {},
  )
  const bookHref = service ? `/${business.slug}/book?${bookParams}` : `/${business.slug}`
  const masterHref = specialist
    ? `/${business.slug}/book?specialist=${specialist.id}`
    : `/${business.slug}`

  const like = (next: boolean) => {
    onLike(next)
    if (next) {
      haptic('impact')
      // A liked work keeps its service in «Избранное», like saving a reel.
      if (service && !favorites.isFavorite(service.id)) favorites.toggle(service.id)
    }
  }

  // Double tap on the picture likes it, with a heart where the finger was — never unlikes.
  const handlePointerDown = (event: React.PointerEvent) => {
    pointerStart.current = { x: event.clientX, y: event.clientY }
  }

  const handlePointerUp = (event: React.PointerEvent) => {
    const start = pointerStart.current
    if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > TAP_SLOP) return
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
      if (!isLiked) like(true)
      return
    }
    lastTap.current = { time: now, x: event.clientX, y: event.clientY }
  }

  const share = async () => {
    const url = `${window.location.origin}/feed?start=${item.id}`
    const title = service ? `${service.name} — ${business.name}` : business.name
    try {
      if (navigator.share) {
        await navigator.share({ title, url })
        return
      }
      await navigator.clipboard.writeText(url)
      toast.show({ title: 'Ссылка скопирована', type: 'success' })
    } catch {
      // The share sheet was closed: nothing to do.
    }
  }

  const report = async () => {
    setIsReported(true)
    await reportFeedItem(item.id).catch(() => undefined)
    toast.show({ title: 'Спасибо, проверим фото', type: 'info' })
  }

  return (
    <article
      className={styles.card}
      data-index={index}
      data-active={isActive || undefined}
      aria-posinset={index + 1}
      aria-setsize={-1}
      aria-label={service ? `${service.name}, ${business.name}` : business.name}
    >
      <div className={styles.media} onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}>
        {/* biome-ignore lint/performance/noImgElement: already resized WebP from our API */}
        <img
          src={item.url}
          alt={service ? `Работа: ${service.name}` : `Работа в ${business.name}`}
          className={styles.photo}
          loading={isNear ? 'eager' : 'lazy'}
          decoding='async'
          draggable={false}
          data-reported={isReported || undefined}
        />
        {bursts.map((burst) => (
          <Heart
            key={burst.id}
            weight='fill'
            aria-hidden
            className={styles.burst}
            style={{ left: burst.x, top: burst.y } as CSSProperties}
            onAnimationEnd={() =>
              setBursts((current) => current.filter((item) => item.id !== burst.id))
            }
          />
        ))}
      </div>

      <div className={styles.side}>
        <button
          type='button'
          className={styles.sideButton}
          aria-pressed={isLiked}
          aria-label={`Нравится: ${likes}`}
          data-liked={isLiked || undefined}
          onClick={() => like(!isLiked)}
        >
          <span className={styles.sideIcon}>
            <Heart weight='fill' aria-hidden />
          </span>
          <span aria-hidden>{likes > 0 ? compact(likes) : 'Нравится'}</span>
        </button>
        {service && (
          <button
            type='button'
            className={styles.sideButton}
            aria-label={`Отзывы: ${item.reviewsCount ?? 0}`}
            onClick={() => setIsReviewsOpen(true)}
          >
            <span className={styles.sideIcon}>
              <ChatCircle weight='fill' aria-hidden />
            </span>
            <span aria-hidden>{item.reviewsCount ? compact(item.reviewsCount) : 'Отзывы'}</span>
          </button>
        )}
        <button type='button' className={styles.sideButton} onClick={() => void share()}>
          <span className={styles.sideIcon}>
            <ShareFat weight='fill' aria-hidden />
          </span>
          <span>Поделиться</span>
        </button>
        <Menu
          label='Ещё'
          className={styles.sideButton}
          trigger={
            <>
              <span className={styles.sideIcon}>
                <DotsThree weight='bold' aria-hidden />
              </span>
              <span aria-hidden>Ещё</span>
            </>
          }
        >
          <MenuItem
            variant='danger'
            icon={<Flag weight='bold' aria-hidden />}
            disabled={isReported}
            onClick={() => void report()}
          >
            Пожаловаться
          </MenuItem>
        </Menu>
      </div>

      <div className={styles.info}>
        {/* Who did it, like a reel's author: the master's face books them, the place opens. */}
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
        <div className={styles.cta}>
          <ButtonLink render={<NextLink href={bookHref} />} size='lg' className={styles.book}>
            {service ? 'Записаться' : 'Выбрать услугу'}
          </ButtonLink>
          {service && slot && (
            <span className={styles.slot}>
              {slot.dayLabel} с {slot.time}
            </span>
          )}
        </div>
      </div>
      {isReviewsOpen && <WorkReviewsSheet item={item} onClose={() => setIsReviewsOpen(false)} />}
    </article>
  )
}
