'use client'

import { CaretLeft, CaretRight, NavigationArrow } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { type CSSProperties, type PointerEvent, useEffect, useRef, useState } from 'react'
import { useFavorites } from '@/features/favorites'
import { getFeed } from '@/shared/api/clientApi'
import type { BusinessKind, FeedItem, FeedPage as FeedPageData } from '@/shared/api/types'
import { BUSINESS_KINDS } from '@/shared/config/platform'
import { haptic } from '@/shared/lib/nativeBridge'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import styles from './FeedPage.module.css'
import { useFeedLikes } from './model/useFeedLikes'
import { FeedActions } from './ui/FeedActions'
import { FeedCard } from './ui/FeedCard'

interface FeedPageProps {
  kind?: BusinessKind
  business?: string
  start?: string
  initialPage?: FeedPageData | null
  isPending?: boolean
}

/** Load the next page this many cards before the end. */
const PREFETCH_AHEAD = 3
/** How far a sideways pull goes before the next card comes to the middle. */
const SWIPE_DISTANCE = 60

// «Образы»: finished work as a hand of cards — one large in the middle, one tilted at each side.
// A swipe brings the next card in; each is a service with its price, the first free time and
// «Записаться».
export const FeedPage = ({ kind, business, start, initialPage, isPending }: FeedPageProps) => {
  const [items, setItems] = useState<FeedItem[]>(initialPage?.items ?? [])
  const [nextOffset, setNextOffset] = useState(initialPage?.nextOffset ?? null)
  const [active, setActive] = useState(0)
  const [dragX, setDragX] = useState(0)
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [reported, setReported] = useState<string[]>([])
  const loadingRef = useRef(false)
  const gesture = useRef<{ x: number; y: number; isSideways: boolean | null } | null>(null)
  const likes = useFeedLikes()
  const favorites = useFavorites()
  // `start` keeps the tapped photo first, so later pages follow the same order.
  const query = { kind, business, start, ...(point ?? {}) }
  const shown = items.filter((item) => !reported.includes(item.id))
  const current = shown[active]

  const turn = (step: number) => {
    setActive((index) => {
      const next = Math.min(shown.length - 1, Math.max(0, index + step))
      if (next !== index) haptic('selection')
      return next
    })
  }

  // Arrow keys, Page Up/Down and j/k turn the hand by one card.
  // biome-ignore lint/correctness/useExhaustiveDependencies: turn reads the latest list
  useEffect(() => {
    const handleKey = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [role="menu"], [role="dialog"]')) return
      const step = {
        ArrowRight: 1,
        ArrowDown: 1,
        PageDown: 1,
        j: 1,
        ArrowLeft: -1,
        ArrowUp: -1,
        PageUp: -1,
        k: -1,
      }[event.key]
      if (!step) return
      event.preventDefault()
      turn(step)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [shown.length])

  // biome-ignore lint/correctness/useExhaustiveDependencies: the query is read when more is needed
  useEffect(() => {
    if (nextOffset === null || loadingRef.current || active < shown.length - PREFETCH_AHEAD) return
    loadingRef.current = true
    getFeed({ ...query, offset: nextOffset })
      .then((page) => {
        setItems((known) => [
          ...known,
          ...page.items.filter((item) => !known.some((entry) => entry.id === item.id)),
        ])
        setNextOffset(page.nextOffset)
      })
      .catch(() => undefined)
      .finally(() => {
        loadingRef.current = false
      })
  }, [active, shown.length, nextOffset])

  const like = (item: FeedItem, next: boolean) => {
    likes.setLiked(item.id, next)
    if (!next) return
    haptic('impact')
    // A liked work keeps its service in «Избранное», like saving a post.
    if (item.service && !favorites.isFavorite(item.service.id)) favorites.toggle(item.service.id)
  }

  const showNearby = () => {
    if (point || !navigator.geolocation) return
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const next = { lat: position.coords.latitude, lng: position.coords.longitude }
        const page = await getFeed({ kind, business, start, ...next }).catch(() => null)
        setIsLocating(false)
        if (!page) return
        setPoint(next)
        setItems(page.items)
        setNextOffset(page.nextOffset)
        setActive(0)
      },
      () => setIsLocating(false),
      { timeout: 10_000, maximumAge: 300_000 },
    )
  }

  // Sideways moves are ours: the middle card follows the finger, and past a short pull the next
  // (or the previous) one comes in. A tap stays a tap (double tap likes).
  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    gesture.current = { x: event.clientX, y: event.clientY, isSideways: null }
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = gesture.current
    if (!start) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (start.isSideways === null && Math.hypot(dx, dy) > 8) {
      start.isSideways = Math.abs(dx) > Math.abs(dy)
      if (start.isSideways) event.currentTarget.setPointerCapture(event.pointerId)
    }
    if (!start.isSideways) return
    // At either end the card only gives a little, like a rubber band.
    const isEdge = (dx > 0 && active === 0) || (dx < 0 && active === shown.length - 1)
    setDragX(isEdge ? dx / 4 : dx)
  }

  const handlePointerUp = () => {
    const start = gesture.current
    gesture.current = null
    if (!start?.isSideways) return
    if (Math.abs(dragX) > SWIPE_DISTANCE) turn(dragX < 0 ? 1 : -1)
    setDragX(0)
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.visuallyHidden}>Образы</h1>
      <nav className={styles.filters} aria-label='Категории работ'>
        {!business && (
          <NextLink
            href='/feed'
            className={styles.chip}
            aria-current={!kind ? 'page' : undefined}
            scroll={false}
          >
            Все
          </NextLink>
        )}
        <button
          type='button'
          className={styles.chip}
          aria-pressed={point !== null}
          onClick={showNearby}
          disabled={isLocating}
        >
          <NavigationArrow weight='fill' aria-hidden />
          {isLocating ? 'Ищем…' : 'Рядом'}
        </button>
        {!business &&
          BUSINESS_KINDS.filter((item) => item.value !== 'other').map((item) => (
            <NextLink
              key={item.value}
              href={`/feed?kind=${item.value}`}
              className={styles.chip}
              aria-current={kind === item.value ? 'page' : undefined}
              scroll={false}
            >
              {item.label}
            </NextLink>
          ))}
      </nav>

      <div
        className={styles.stage}
        role='feed'
        aria-label='Образы'
        aria-busy={isPending || undefined}
        data-dragging={dragX !== 0 || undefined}
        style={{ '--drag': `${dragX}px`, '--tilt': `${dragX / 30}deg` } as CSSProperties}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {isPending && <div className={styles.placeholder} />}
        {!isPending && shown.length === 0 && (
          <EmptyState
            isOnDark
            title='Образов пока нет'
            text='Здесь появятся фото работ мастеров — с ценой и записью в один тап.'
            action={
              <NextLink href='/' className={styles.emptyLink}>
                Открыть каталог ›
              </NextLink>
            }
          />
        )}
        {/* The card in play, one at each side, and the next one waiting unseen (its photo loads). */}
        {shown.map((item, index) => {
          const offset = index - active
          if (offset < -1 || offset > 2) return null
          return (
            <FeedCard
              key={item.id}
              item={item}
              index={index}
              offset={offset}
              isLiked={likes.isLiked(item.id)}
              onDoubleTap={() => like(item, true)}
              onSelect={() => turn(offset)}
            />
          )
        })}
      </div>

      {/* With a mouse: the previous and the next card at the sides of the hand (keys work too). */}
      {shown.length > 1 && (
        <div className={styles.turns}>
          <button
            type='button'
            className={styles.turn}
            data-side='left'
            aria-label='Предыдущая работа'
            disabled={active === 0}
            onClick={() => turn(-1)}
          >
            <CaretLeft weight='bold' aria-hidden />
          </button>
          <button
            type='button'
            className={styles.turn}
            data-side='right'
            aria-label='Следующая работа'
            disabled={active >= shown.length - 1}
            onClick={() => turn(1)}
          >
            <CaretRight weight='bold' aria-hidden />
          </button>
        </div>
      )}

      {current && (
        <>
          <p className={styles.counter} aria-hidden>
            {active + 1} из {nextOffset === null ? shown.length : `${shown.length}+`}
          </p>
          <FeedActions
            key={current.id}
            item={current}
            isLiked={likes.isLiked(current.id)}
            onLike={(next) => like(current, next)}
            onReported={() => {
              setReported((known) => [...known, current.id])
              setActive((index) => Math.max(0, Math.min(index, shown.length - 2)))
            }}
          />
        </>
      )}
    </main>
  )
}
