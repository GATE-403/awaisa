'use client'

import { Toggle, ToggleGroup } from '@awaisa/ui/ToggleGroup'
import { useState } from 'react'
import { useNextFree } from '@/entities/business'
import { OfferCard } from '@/entities/offer'
import { FavoriteButton } from '@/features/favorites'
import type { Offer } from '@/shared/api/types'
import styles from './OffersFeed.module.css'

type FeedSort = 'popular' | 'soon' | 'price'

interface OffersFeedProps {
  title: string
  offers: Offer[]
  initialSort: FeedSort
}

const SORTS: { value: FeedSort; label: string }[] = [
  { value: 'popular', label: 'Популярные' },
  { value: 'soon', label: 'Раньше свободно' },
  { value: 'price', label: 'Дешевле' },
]

const NO_SLOT = '9999-12-31 99:99'

// The main feed, like products on a marketplace: every service in every place, sortable.
export const OffersFeed = ({ title, offers, initialSort }: OffersFeedProps) => {
  const [sort, setSort] = useState(initialSort)
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

  return (
    <section className={styles.feed} aria-labelledby='offers-title'>
      <div className={styles.header}>
        <h2 id='offers-title' className={styles.title}>
          {title}
          <span className={styles.count}>{offers.length}</span>
        </h2>
        <ToggleGroup
          aria-label='Сортировка'
          layout='scroll'
          value={[sort]}
          onValueChange={(values) => {
            const next = values.at(-1)
            if (next) setSort(next as FeedSort)
          }}
        >
          {SORTS.map((item) => (
            <Toggle key={item.value} value={item.value} size='sm'>
              {item.label}
            </Toggle>
          ))}
        </ToggleGroup>
      </div>
      <ul className={styles.grid}>
        {sorted.map((offer) => (
          <li key={offer.id}>
            <OfferCard offer={offer} action={<FavoriteButton id={offer.id} label={offer.name} />} />
          </li>
        ))}
      </ul>
    </section>
  )
}

export type { FeedSort }
