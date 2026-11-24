'use client'

import { Fragment } from 'react'
import { useNextFree } from '@/entities/business'
import { OfferCard } from '@/entities/offer'
import { FavoriteButton } from '@/features/favorites'
import type { BusinessKind, FeedItem, Offer } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { useEndReached } from '@/shared/lib/hooks/useEndReached'
import { Picture } from '@/shared/ui/Placeholder/Placeholder'
import { WorkTile } from '../WorkTile/WorkTile'
import styles from './OffersFeed.module.css'

type FeedSort = 'popular' | 'soon' | 'price'

interface OffersFeedProps {
  offers: Offer[]
  sort: FeedSort
  /** The masters' work, set into the grid one cell at a time (`WorkTile`). */
  works?: FeedItem[]
  /** The chosen kind, so a work opens «Looks» of the same kind. */
  kind?: BusinessKind
  /** More pages wait on the server: the end of the list asks for the next one. */
  hasMore?: boolean
  isLoading?: boolean
  onEndReached?: () => void
}

const FEED_SORTS: { value: FeedSort; label: string }[] = [
  { value: 'popular', label: 'Popular' },
  { value: 'soon', label: 'Soonest' },
  { value: 'price', label: 'Cheapest' },
]

const NO_SLOT = '9999-12-31 99:99'
const WORK_FIRST = 3
const WORK_EVERY = 5

// Which work goes before this card: the first after three cards, then one every five more -
// the grid keeps its rhythm and the work reads as part of it, not as a section.
const workAt = (index: number) =>
  index >= WORK_FIRST && (index - WORK_FIRST) % WORK_EVERY === 0
    ? (index - WORK_FIRST) / WORK_EVERY
    : null

// Every third work is a feature (two cards wide), so the grid has a beat instead of a list's.
const isBigWork = (position: number) => position % 3 === 1

// The main feed, like products on a marketplace: every service in every place, sortable.
export const OffersFeed = ({
  offers,
  sort,
  works,
  kind,
  hasMore = false,
  isLoading = false,
  onEndReached,
}: OffersFeedProps) => {
  const t = useT()
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

  // One «Hit» per place: its most booked service (offers arrive popular-first per place).
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
          const position = workAt(index)
          const work = position === null ? undefined : works?.[position]
          return (
            <Fragment key={offer.id}>
              {work && position !== null && (
                <li className={styles.work} data-big={isBigWork(position) || undefined}>
                  <WorkTile
                    item={work}
                    kind={kind}
                    isBig={isBigWork(position)}
                    isPriority={position === 0}
                  />
                </li>
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
      {isLoading && <output className={styles.loadingNote}>{t('Loading more…')}</output>}
    </div>
  )
}

export type { FeedSort }
export { FEED_SORTS }
