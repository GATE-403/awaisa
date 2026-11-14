'use client'

import { CaretDown, CaretUp, NavigationArrow } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { getFeed } from '@/shared/api/clientApi'
import type { BusinessKind, FeedItem, FeedPage as FeedPageData } from '@/shared/api/types'
import { BUSINESS_KINDS } from '@/shared/config/platform'
import styles from './FeedPage.module.css'
import { useFeedLikes } from './model/useFeedLikes'
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

// «Работы»: finished work as a vertical feed, one photo a screen — like Shorts, but each card
// is a service with its price, the nearest free time and «Записаться».
export const FeedPage = ({ kind, business, start, initialPage, isPending }: FeedPageProps) => {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [items, setItems] = useState<FeedItem[]>(initialPage?.items ?? [])
  const [nextOffset, setNextOffset] = useState(initialPage?.nextOffset ?? null)
  const [active, setActive] = useState(0)
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const loadingRef = useRef(false)
  const likes = useFeedLikes()
  // `start` keeps the tapped photo first, so later pages follow the same order.
  const query = { kind, business, start, ...(point ?? {}) }

  // The card that fills the screen is the active one: it animates and asks for free time.
  // biome-ignore lint/correctness/useExhaustiveDependencies: new cards need observing as they arrive
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index))
        }
      },
      { root: scroller, threshold: 0.6 },
    )
    for (const card of scroller.querySelectorAll('[data-index]')) observer.observe(card)
    return () => observer.disconnect()
  }, [items])

  // Arrow keys, Page Up/Down and j/k turn the feed by one card, as on a video feed.
  useEffect(() => {
    const handleKey = (event: globalThis.KeyboardEvent) => {
      const scroller = scrollerRef.current
      const target = event.target as HTMLElement | null
      if (!scroller || target?.closest('input, textarea, select, [role="menu"]')) return
      const step = { ArrowDown: 1, PageDown: 1, j: 1, ArrowUp: -1, PageUp: -1, k: -1 }[event.key]
      if (!step) return
      event.preventDefault()
      scroller.scrollBy({ top: step * scroller.clientHeight })
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: the query is read when more is needed
  useEffect(() => {
    if (nextOffset === null || loadingRef.current || active < items.length - PREFETCH_AHEAD) return
    loadingRef.current = true
    getFeed({ ...query, offset: nextOffset })
      .then((page) => {
        setItems((current) => [
          ...current,
          ...page.items.filter((item) => !current.some((known) => known.id === item.id)),
        ])
        setNextOffset(page.nextOffset)
      })
      .catch(() => undefined)
      .finally(() => {
        loadingRef.current = false
      })
  }, [active, items.length, nextOffset])

  const turn = (step: 1 | -1) => {
    const scroller = scrollerRef.current
    scroller?.scrollBy({ top: step * scroller.clientHeight, behavior: 'smooth' })
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
        scrollerRef.current?.scrollTo({ top: 0 })
      },
      () => setIsLocating(false),
      { timeout: 10_000, maximumAge: 300_000 },
    )
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.visuallyHidden}>Работы мастеров</h1>
      {/* Text tabs over the picture, like a short-video feed's top: no plates to hide the work. */}
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

      {/* With a mouse: the next and previous work, like Shorts' arrows (keys work too). */}
      {items.length > 1 && (
        <div className={styles.turns}>
          <button
            type='button'
            className={styles.turn}
            aria-label='Предыдущая работа'
            disabled={active === 0}
            onClick={() => turn(-1)}
          >
            <CaretUp weight='bold' aria-hidden />
          </button>
          <button
            type='button'
            className={styles.turn}
            aria-label='Следующая работа'
            disabled={active >= items.length - 1}
            onClick={() => turn(1)}
          >
            <CaretDown weight='bold' aria-hidden />
          </button>
        </div>
      )}

      <div
        ref={scrollerRef}
        className={styles.scroller}
        role='feed'
        aria-label='Лента работ'
        aria-busy={isPending || undefined}
      >
        {isPending && <div className={styles.placeholder} />}
        {!isPending && items.length === 0 && (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>Работ пока нет</p>
            <p className={styles.emptyText}>
              Здесь появятся фото работ мастеров — с ценой и записью в один тап.
            </p>
            <NextLink href='/' className={styles.emptyLink}>
              Открыть каталог ›
            </NextLink>
          </div>
        )}
        {items.map((item, index) => (
          <FeedCard
            key={item.id}
            item={item}
            index={index}
            isActive={index === active}
            isNear={Math.abs(index - active) <= 1}
            isLiked={likes.isLiked(item.id)}
            onLike={(isLiked) => likes.setLiked(item.id, isLiked)}
          />
        ))}
      </div>
    </main>
  )
}
