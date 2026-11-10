'use client'

import { useNextFree } from '@/entities/business'
import { OfferCard } from '@/entities/offer'
import { FavoriteButton } from '@/features/favorites'
import type { Offer } from '@/shared/api/types'
import styles from './OffersFeed.module.css'

type FeedSort = 'popular' | 'soon' | 'price'

interface OffersFeedProps {
  offers: Offer[]
  sort: FeedSort
}

const FEED_SORTS: { value: FeedSort; label: string }[] = [
  { value: 'popular', label: 'Популярные' },
  { value: 'soon', label: 'Ближе по времени' },
  { value: 'price', label: 'Дешевле' },
]

const NO_SLOT = '9999-12-31 99:99'

// The main feed, like products on a marketplace: every service in every place, sortable.
export const OffersFeed = ({ offers, sort }: OffersFeedProps) => {
  const nextFree = useNextFree()
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
        {sorted.map((offer) => (
          <li key={offer.id}>
            <OfferCard
              offer={offer}
              isHit={hits.has(offer.id)}
              action={<FavoriteButton id={offer.id} label={offer.name} />}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

export type { FeedSort }
export { FEED_SORTS }
