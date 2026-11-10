'use client'

import { Select } from '@awaisa/ui/Select'
import NextLink from 'next/link'
import { useState } from 'react'
import { BusinessCard } from '@/entities/business'
import type { BusinessCard as BusinessCardData, Offer } from '@/shared/api/types'
import { pluralize } from '@/shared/lib/plural'
import { FEED_SORTS, type FeedSort, OffersFeed } from '../OffersFeed/OffersFeed'
import styles from './CatalogResults.module.css'

type ResultsView = 'places' | 'services'

interface CatalogResultsProps {
  title: string
  businesses: BusinessCardData[]
  offers: Offer[]
  initialView: ResultsView
  initialSort: FeedSort
  canReset: boolean
}

// First choose where (places), then what (services) — one switch instead of two long sections.
export const CatalogResults = ({
  title,
  businesses,
  offers,
  initialView,
  initialSort,
  canReset,
}: CatalogResultsProps) => {
  const [view, setView] = useState(initialView)
  const [sort, setSort] = useState(initialSort)
  const views = [
    { value: 'places' as const, label: 'Места', count: businesses.length },
    { value: 'services' as const, label: 'Услуги', count: offers.length },
  ]

  return (
    <section className={styles.results} aria-labelledby='results-title'>
      <div className={styles.header}>
        <h2 id='results-title' className={styles.title}>
          {title}
        </h2>
        {canReset && (
          <NextLink href='/' className={styles.reset}>
            Сбросить
          </NextLink>
        )}
      </div>
      <div className={styles.toolbar}>
        {/* Two big text tabs, like «Shop by» on apple.com: first where, then what. */}
        <div className={styles.views} role='tablist' aria-label='Что показать'>
          {views.map((item) => (
            <button
              key={item.value}
              type='button'
              role='tab'
              aria-selected={view === item.value}
              className={styles.view}
              onClick={() => setView(item.value)}
            >
              {item.label}
              <span className={styles.viewCount}>{item.count}</span>
            </button>
          ))}
        </div>
        {view === 'services' && offers.length > 1 && (
          <Select
            variant='plain'
            aria-label='Сортировка'
            items={FEED_SORTS}
            value={sort}
            onValueChange={(value) => value && setSort(value as FeedSort)}
            className={styles.sort}
          />
        )}
      </div>

      {view === 'places' &&
        (businesses.length === 0 ? (
          <p className={styles.empty}>Мест не нашли — попробуйте другую категорию или услугу.</p>
        ) : (
          <ul
            className={styles.places}
            aria-label={pluralize(businesses.length, ['место', 'места', 'мест'])}
          >
            {businesses.map((business) => (
              <li key={business.slug}>
                <BusinessCard business={business} />
              </li>
            ))}
          </ul>
        ))}

      {view === 'services' &&
        (offers.length === 0 ? (
          <p className={styles.empty}>Услуг не нашли — попробуйте другое слово.</p>
        ) : (
          <OffersFeed offers={offers} sort={sort} />
        ))}
    </section>
  )
}

export type { ResultsView }
