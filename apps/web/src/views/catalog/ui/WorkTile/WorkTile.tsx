'use client'

import { Heart } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { type CSSProperties, type MouseEvent, useEffect, useRef, useState } from 'react'
import { PersonAvatar } from '@/entities/business'
import { useFavorites } from '@/features/favorites'
import { useWorkLikes } from '@/features/workLikes'
import type { BusinessKind, FeedItem } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { gridImage } from '@/shared/lib/imageSizes'
import { haptic } from '@/shared/lib/nativeBridge'
import { FanCardsIcon } from '@/shared/ui/FanCardsIcon'
import { BIG_TILE_IMAGE, DOUBLE_TAP_MS } from '../../config/workTile'
import { workFeedHref, workLookHref } from '../../lib/workLinks'
import styles from './WorkTile.module.css'

interface WorkTileProps {
  item: FeedItem
  kind: BusinessKind | undefined
  /** A feature: two cards wide (and two tall from 768px), so the grid does not read as a list. */
  isBig?: boolean
  /** On the first screen: loaded at once and first (it is often the page's largest picture). */
  isPriority?: boolean
}

type Burst = { id: number; x: number; y: number }

// A master's work set into the services grid as one of its cells: the same shape, radius and
// scrim as the service cards, told apart by «✦ Образ», the master's face, the likes and «Хочу
// так», which books that service with that master and hands the photo over as the look wanted.
// A tap opens «Образы» on this photo; on a touch screen a double tap likes it, as in the deck.
export const WorkTile = ({ item, kind, isBig = false, isPriority = false }: WorkTileProps) => {
  const t = useT()
  const router = useRouter()
  const likes = useWorkLikes()
  const favorites = useFavorites()
  const isLiked = likes.isLiked(item.id)
  // The feed answer is cached: the count adds this device's own like on top of it.
  const [wasLiked] = useState(isLiked)
  const [bursts, setBursts] = useState<Burst[]>([])
  const pointerType = useRef('mouse')
  const lastTap = useRef(0)
  const openTimer = useRef<number | undefined>(undefined)
  const likesCount = (item.likes ?? 0) + (isLiked === wasLiked ? 0 : isLiked ? 1 : -1)
  const author = item.specialist?.name.split(' ')[0]

  const feedHref = workFeedHref(item, kind)
  const lookHref = workLookHref(item)

  useEffect(() => () => window.clearTimeout(openTimer.current), [])

  const setLiked = (next: boolean) => {
    likes.setLiked(item.id, next)
    haptic('selection')
    if (!next) return
    // A liked work keeps its service in «Избранное», like saving a post (the same as the deck).
    if (item.service && !favorites.isFavorite(item.service.id)) favorites.toggle(item.service.id)
  }

  // With a mouse a click opens at once; a finger waits a moment for a second tap, which likes.
  const handleOpen = (event: MouseEvent<HTMLAnchorElement>) => {
    if (pointerType.current !== 'touch') return
    event.preventDefault()
    const now = performance.now()
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      window.clearTimeout(openTimer.current)
      lastTap.current = 0
      const card = event.currentTarget.closest('[data-card]')?.getBoundingClientRect()
      if (card) {
        setBursts((current) => [
          ...current,
          { id: now, x: event.clientX - card.left, y: event.clientY - card.top },
        ])
      }
      if (!isLiked) setLiked(true)
      return
    }
    lastTap.current = now
    openTimer.current = window.setTimeout(() => router.push(feedHref), DOUBLE_TAP_MS)
  }

  return (
    // Not an article: the catalog's grid counts its service cards as articles.
    <div
      className={styles.tile}
      data-big={isBig || undefined}
      data-card=''
      data-picture-frame=''
      onPointerDown={(event) => {
        pointerType.current = event.pointerType
      }}
    >
      {/* biome-ignore lint/performance/noImgElement: already resized WebP from our API */}
      <img
        {...gridImage(item.url, isBig ? BIG_TILE_IMAGE : undefined)}
        alt=''
        className={styles.image}
        data-card-media=''
        loading={isPriority ? 'eager' : 'lazy'}
        fetchPriority={isPriority ? 'high' : undefined}
        decoding='async'
      />
      <span className={styles.marks}>
        <span className={styles.kind}>
          <FanCardsIcon aria-hidden />
          {t('Образ')}
        </span>
        {/* A client's own photo from their review: trusted more than the salon's own shots. */}
        {item.isFromClient && <span className={styles.client}>{t('Фото клиента')}</span>}
      </span>
      <button
        type='button'
        className={styles.like}
        aria-pressed={isLiked}
        aria-label={t('Нравится: {count}', { count: likesCount })}
        data-liked={isLiked || undefined}
        onClick={() => setLiked(!isLiked)}
      >
        <span className={styles.likeBody}>
          <Heart weight={isLiked ? 'fill' : 'regular'} aria-hidden />
          {likesCount > 0 && <span className={styles.likeCount}>{likesCount}</span>}
        </span>
      </button>
      {bursts.map((burst) => (
        <Heart
          key={burst.id}
          weight='fill'
          aria-hidden
          className={styles.burst}
          style={{ left: burst.x, top: burst.y } as CSSProperties}
          onAnimationEnd={() =>
            setBursts((current) => current.filter((other) => other.id !== burst.id))
          }
        />
      ))}
      <span className={styles.caption}>
        <span className={styles.author}>
          {item.specialist ? (
            <PersonAvatar
              name={item.specialist.name}
              src={item.specialist.photoUrl ?? undefined}
              size='sm'
              className={styles.face}
            />
          ) : null}
          <span className={styles.authorName}>
            {author ? `${author} · ${item.business.name}` : item.business.name}
          </span>
        </span>
        {/* The whole card opens «Образы» through this link (stretched over the card). */}
        <h3 className={styles.name}>
          <NextLink href={feedHref} className={styles.open} onClick={handleOpen}>
            {item.service?.name ?? item.business.name}
          </NextLink>
        </h3>
        <NextLink href={lookHref} className={styles.want}>
          {t('Хочу так')}
        </NextLink>
      </span>
    </div>
  )
}
