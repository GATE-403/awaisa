'use client'

import { CaretLeft, CaretRight } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { type CSSProperties, type PointerEvent, useEffect, useRef, useState } from 'react'
import { useFavorites } from '@/features/favorites'
import { useWorkLikes } from '@/features/workLikes'
import { getFeed } from '@/shared/api/clientApi'
import type { BusinessKind, FeedItem, FeedPage as FeedPageData } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { knownPosition } from '@/shared/lib/geo'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import styles from './FeedPage.module.css'
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
/** How far a sideways swipe (to the next card) or a pull up (back to the last one) goes… */
const SWIPE_DISTANCE = 32
/** …or how fast (px per ms): a quick flick counts however short it is. */
const FLICK_SPEED = 0.25
const FLICK_MIN = 10
/** The flick's speed is read over the finger's last moments, not the whole gesture. */
const FLICK_WINDOW_MS = 90

// «Образы»: finished work as a hand of cards - one large in the middle, one tilted at each side.
// A swipe brings the next card in; each is a service with its price, the first free time and
// «Записаться».
export const FeedPage = ({ kind, business, start, initialPage, isPending }: FeedPageProps) => {
  const t = useT()
  const [items, setItems] = useState<FeedItem[]>(initialPage?.items ?? [])
  const [nextOffset, setNextOffset] = useState(initialPage?.nextOffset ?? null)
  const [active, setActive] = useState(0)
  const stageRef = useRef<HTMLDivElement>(null)
  const frame = useRef(0)
  const stopListening = useRef<(() => void) | null>(null)
  // The side the last card was swiped to: it waits there and comes back from there.
  const [flyDir, setFlyDir] = useState<1 | -1>(-1)
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null)
  const [reported, setReported] = useState<string[]>([])
  const loadingRef = useRef(false)
  // Once the person has turned a card, a late «nearest first» answer no longer reshuffles the deck.
  const touchedRef = useRef(false)
  const gesture = useRef<{
    x: number
    y: number
    time: number
    isSideways: boolean | null
    dx: number
    dy: number
    samples: { t: number; x: number; y: number }[]
  } | null>(null)
  const likes = useWorkLikes()
  const favorites = useFavorites()
  // `start` keeps the tapped photo first, so later pages follow the same order.
  const query = { kind, business, start, ...(point ?? {}) }
  const shown = items.filter((item) => !reported.includes(item.id))
  const current = shown[active]

  const turn = (step: number) => {
    touchedRef.current = true
    setActive((index) => Math.min(shown.length - 1, Math.max(0, index + step)))
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

  useEffect(() => () => stopListening.current?.(), [])

  // The photos about to come up are decoded ahead, off screen: decoding a large photo the moment
  // its card slid into view cost frames in the middle of the move.
  // biome-ignore lint/correctness/useExhaustiveDependencies: once per turn
  useEffect(() => {
    for (const item of shown.slice(active + 1, active + 5)) {
      const image = new Image()
      image.src = item.url
      image.decode().catch(() => undefined)
    }
  }, [active, shown.length])

  const like = (item: FeedItem, next: boolean) => {
    likes.setLiked(item.id, next)
    if (!next) return
    // A liked work keeps its service in «Избранное», like saving a post.
    if (item.service && !favorites.isFavorite(item.service.id)) favorites.toggle(item.service.id)
  }

  // No filters on the deck: the work nearest to where the person is comes first, when that is
  // already known (a granted location or a picked district) - never a permission prompt.
  // biome-ignore lint/correctness/useExhaustiveDependencies: once, for the deck the page opened with
  useEffect(() => {
    if (start || business) return
    let isCancelled = false
    knownPosition().then(async (next) => {
      if (!next || isCancelled) return
      const page = await getFeed({ kind, business, start, ...next }).catch(() => null)
      if (!page || isCancelled || touchedRef.current) return
      setPoint(next)
      setItems(page.items)
      setNextOffset(page.nextOffset)
      setActive(0)
    })
    return () => {
      isCancelled = true
    }
  }, [])

  // A swipe either way sends the card in play off that side and the next one comes up, like
  // dealing from a deck; a pull up brings the last card back. A tap stays a tap (double tap likes).
  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    gesture.current = {
      x: event.clientX,
      y: event.clientY,
      time: performance.now(),
      isSideways: null,
      dx: 0,
      dy: 0,
      samples: [{ t: performance.now(), x: event.clientX, y: event.clientY }],
    }
    // The rest of the gesture is followed on the window: a mouse that wanders off the stack, or
    // is let go outside the window, still ends it (the card used to freeze mid-drag).
    stopListening.current?.()
    const end = (upEvent: Event) => handlePointerUp(upEvent)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    window.addEventListener('blur', end)
    stopListening.current = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      window.removeEventListener('blur', end)
      stopListening.current = null
    }
  }

  // Where the finger went over its last moments: a phone's WebView delivers moves late and in
  // bursts, so an average from the first touch read a quick flick as a slow drag.
  const record = (state: NonNullable<typeof gesture.current>, x: number, y: number) => {
    const now = performance.now()
    state.samples.push({ t: now, x, y })
    while (state.samples.length > 2 && now - (state.samples[0]?.t ?? now) > FLICK_WINDOW_MS)
      state.samples.shift()
  }

  const speed = (state: NonNullable<typeof gesture.current>, axis: 'x' | 'y') => {
    const first = state.samples[0]
    const last = state.samples.at(-1)
    if (!first || !last || last.t === first.t) return 0
    return (last[axis] - first[axis]) / (last.t - first.t)
  }

  // The finger's path is written straight to CSS variables once a frame, never through React state:
  // re-rendering the deck on every move dropped frames on phones. They go on the card in play
  // itself - set on the stage, every card and every line of text in it was restyled each frame.
  const paint = () => {
    frame.current = 0
    const stage = stageRef.current
    const state = gesture.current
    if (!stage) return
    const dx = state?.isSideways ? state.dx : 0
    const dy = state && state.isSideways === false ? state.dy : 0
    const isDragging = dx !== 0 || dy !== 0
    const card = stage.querySelector<HTMLElement>('[data-active]')
    if (card) {
      card.style.setProperty('--drag', `${dx}px`)
      card.style.setProperty('--lift', `${dy / 3}px`)
      card.style.setProperty('--tilt', `${dx / 30}deg`)
    }
    if (stage.hasAttribute('data-dragging') !== isDragging)
      stage.toggleAttribute('data-dragging', isDragging)
  }

  const schedulePaint = () => {
    if (!frame.current) frame.current = requestAnimationFrame(paint)
  }

  const handlePointerMove = (event: globalThis.PointerEvent) => {
    const start = gesture.current
    if (!start) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    record(start, event.clientX, event.clientY)
    if (start.isSideways === null && Math.hypot(dx, dy) > 6) {
      start.isSideways = Math.abs(dx) > Math.abs(dy)
    }
    if (start.isSideways === null) return
    if (start.isSideways) {
      // At the end of the deck the card only gives a little, like a rubber band.
      start.dx = active >= shown.length - 1 ? dx / 4 : dx
    } else {
      // Only up, and only when there is a card to bring back.
      start.dy = active > 0 && dy < 0 ? dy : dy / 6
    }
    schedulePaint()
  }

  const handlePointerUp = (event: globalThis.PointerEvent | Event) => {
    stopListening.current?.()
    const start = gesture.current
    gesture.current = null
    // Let go of the drag now, not on the next frame: the deck turns in this same render, and with
    // the drag still on (transitions off) the cards jumped to their places instead of gliding.
    if (frame.current) cancelAnimationFrame(frame.current)
    paint()
    if (!start || start.isSideways === null) return
    if (event instanceof PointerEvent && event.type === 'pointerup')
      record(start, event.clientX, event.clientY)
    // Far enough, or a quick flick the same way however short.
    const isFar = (distance: number, velocity: number) =>
      distance > SWIPE_DISTANCE ||
      (distance > FLICK_MIN &&
        Math.abs(velocity) > FLICK_SPEED &&
        Math.sign(velocity) === Math.sign(distance))
    if (start.isSideways && active < shown.length - 1) {
      const vx = speed(start, 'x')
      if (isFar(Math.abs(start.dx), Math.sign(start.dx) * vx)) {
        setFlyDir(start.dx < 0 ? -1 : 1)
        turn(1)
      }
    }
    if (!start.isSideways && start.dy < 0 && isFar(-start.dy, -speed(start, 'y'))) turn(-1)
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.visuallyHidden}>{t('Образы')}</h1>

      <div
        className={styles.stage}
        ref={stageRef}
        style={{ '--fly': flyDir } as CSSProperties}
        onPointerDown={handlePointerDown}
      >
        {isPending && <div className={styles.placeholder} />}
        {!isPending && shown.length === 0 && (
          <EmptyState
            title={t('Образов пока нет')}
            text={t('Здесь появятся фото работ мастеров - с ценой и записью в один тап.')}
            action={
              <NextLink href='/' className={styles.emptyLink}>
                {t('Открыть каталог ›')}
              </NextLink>
            }
          />
        )}
        {/* The card in play, two fanned behind it, the next one waiting unseen (its photo loads) and
            the last one gone off to the side. */}
        {/* Only the cards are the feed (a feed holds articles alone); the actions sit beside it. */}
        <div
          className={styles.deck}
          role='feed'
          aria-label={t('Образы')}
          aria-busy={isPending || undefined}
        >
          {shown.map((item, index) => {
            const offset = index - active
            if (offset < -1 || offset > 3) return null
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
        {current && (
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
        )}
      </div>

      {/* With a mouse: the previous and the next card at the sides of the hand (keys work too). */}
      {shown.length > 1 && (
        <div className={styles.turns}>
          <button
            type='button'
            className={styles.turn}
            data-side='left'
            aria-label={t('Предыдущая работа')}
            disabled={active === 0}
            onClick={() => turn(-1)}
          >
            <CaretLeft aria-hidden />
          </button>
          <button
            type='button'
            className={styles.turn}
            data-side='right'
            aria-label={t('Следующая работа')}
            disabled={active >= shown.length - 1}
            onClick={() => turn(1)}
          >
            <CaretRight aria-hidden />
          </button>
        </div>
      )}

      {active > 0 && (
        <p className={styles.hint} aria-hidden>
          {t('Потяните вверх - вернуть прошлую')}
        </p>
      )}
    </main>
  )
}
