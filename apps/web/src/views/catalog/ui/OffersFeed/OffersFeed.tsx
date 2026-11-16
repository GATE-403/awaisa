'use client'

import { Fragment, type ReactNode } from 'react'
import { useNextFree } from '@/entities/business'
import { OfferCard } from '@/entities/offer'
import { FavoriteButton } from '@/features/favorites'
import type { Offer } from '@/shared/api/types'
import { useEndReached } from '@/shared/lib/hooks/useEndReached'
import { Picture } from '@/shared/ui/Placeholder/Placeholder'
import styles from './OffersFeed.module.css'

type FeedSort = 'popular' | 'soon' | 'price'

interface OffersFeedProps {
  offers: Offer[]
  sort: FeedSort
  /** Blocks set into the grid — the first after two rows, then every `INTERLUDE_EVERY` cards. */
  interlude?: (block: number) => ReactNode
  /** More pages wait on the server: the end of the list asks for the next one. */
  hasMore?: boolean
  isLoading?: boolean
  onEndReached?: () => void
}

const FEED_SORTS: { value: FeedSort; label: string }[] = [
  { value: 'popular', label: 'Популярные' },
  { value: 'soon', label: 'Ближе по времени' },
  { value: 'price', label: 'Дешевле' },
]

const NO_SLOT = '9999-12-31 99:99'
const INTERLUDE_FIRST = 4
const INTERLUDE_EVERY = 8

// Where a block goes: after the 4th card, then after every eighth one more.
const blockAt = (index: number) =>
  index >= INTERLUDE_FIRST && (index - INTERLUDE_FIRST) % INTERLUDE_EVERY === 0
    ? (index - INTERLUDE_FIRST) / INTERLUDE_EVERY
    : null

// The main feed, like products on a marketplace: every service in every place, sortable.
export const OffersFeed = ({
  offers,
  sort,
  interlude,
  hasMore = false,
  isLoading = false,
  onEndReached,
}: OffersFeedProps) => {
  const nextFree = useNextFree()
  const end = useEndReached(() => onEndReached?.(), hasMore && !isLoading)
  const sorted =
    sort === 'price'
      ? [...offers].sort((first, second) => first.price - second.price)
      : sort === 'soon' && nextFree
        ? [...offers].sort((first, second) => {
            const a = nextFree[first.slug]
            const b = nextFree[second.slug]
            return (a ? `${a.date} ${a.time}` : NO_SLOT).localeCompare(
              b ? `${b.date} ${b.time}` : NO_SLOT,
            )
          })
        : offers

  // One «Хит» per place: its most booked service (offers arrive popular-first per place).
  const hits = new Set<string>()
  const seenPlaces = new Set<string>()
  for (const offer of offers) {
    if (seenPlaces.has(offer.slug)) continue
    seenPlaces.add(offer.slug)
    if (offer.isPopular) hits.add(offer.id)
  }

  return (
    <div className={styles.feed}>
      <ul className={styles.grid}>
        {sorted.map((offer, index) => {
          const block = interlude ? blockAt(index) : null
          return (
            <Fragment key={offer.id}>
              {block !== null && interlude?.(block) && (
                <li className={styles.interlude}>{interlude(block)}</li>
              )}
              <li>
                <OfferCard
                  offer={offer}
                  isHit={hits.has(offer.id)}
                  isPriority={index < 4}
                  action={<FavoriteButton id={offer.id} label={offer.name} />}
                />
              </li>
            </Fragment>
          )
        })}
        {sorted.length <= INTERLUDE_FIRST && interlude && (
          <li className={styles.interlude}>{interlude(0)}</li>
        )}
        {/* The next page on its way: placeholder cards of the same shape. */}
        {isLoading &&
          Array.from({ length: 4 }, (_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: identical placeholders
            <li key={`loading-${index}`} aria-hidden>
              <Picture className={styles.placeholder} />
            </li>
          ))}
      </ul>
      {hasMore && <div ref={end} className={styles.sentinel} aria-hidden />}
      {isLoading && <output className={styles.loadingNote}>Загружаем ещё…</output>}
    </div>
  )
}

export type { FeedSort }
export { FEED_SORTS }
