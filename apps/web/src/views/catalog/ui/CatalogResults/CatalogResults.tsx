'use client'

import { Select } from '@awaisa/ui/Select'
import NextLink from 'next/link'
import { Fragment, type ReactNode, useEffect, useState } from 'react'
import { BusinessCard } from '@/entities/business'
import type { BusinessCard as BusinessCardData, BusinessKind, Offer } from '@/shared/api/types'
import { useEndReached } from '@/shared/lib/hooks/useEndReached'
import { pluralize } from '@/shared/lib/plural'
import { trackStep } from '@/shared/lib/telemetry'
import { TextTabs } from '@/shared/ui/TextTabs/TextTabs'
import { useOfferPages } from '../../model/useOfferPages'
import { FEED_SORTS, type FeedSort, OffersFeed } from '../OffersFeed/OffersFeed'
import styles from './CatalogResults.module.css'

type ResultsView = 'places' | 'services'

/** Two rows on phones; CSS moves the shelf below two rows on wider grids too. */
const INTERLUDE_AFTER = 4
/** Places are drawn a screenful at a time as the list scrolls. */
const PLACES_STEP = 24

interface CatalogResultsProps {
  title: string
  /** The text actually typed when it was read as something else («cnhb;rf» → «стрижка»). */
  searchedFor?: string
  businesses: BusinessCardData[]
  offers: Offer[]
  initialView: ResultsView
  initialSort: FeedSort
  canReset: boolean
  /** A shelf set into the grid after the first rows, like Shorts in a video feed. */
  interlude?: ReactNode
  kind?: BusinessKind
  query?: string
}

// What first (services), then where (places) — one switch instead of two long sections.
export const CatalogResults = ({
  title,
  searchedFor,
  businesses,
  offers,
  initialView,
  initialSort,
  canReset,
  interlude,
  kind,
  query,
}: CatalogResultsProps) => {
  const [view, setView] = useState(initialView)
  const [sort, setSort] = useState(initialSort)
  const [placesShown, setPlacesShown] = useState(PLACES_STEP)

  useEffect(() => {
    trackStep('catalog')
  }, [])
  // The services feed pages from the server; «Ближе по времени» re-sorts what is loaded.
  const feed = useOfferPages({
    initial: offers,
    initialSort: initialSort === 'price' ? 'price' : 'popular',
    sort: sort === 'price' ? 'price' : 'popular',
    kind,
    query,
  })
  const placesEnd = useEndReached(
    () => setPlacesShown((count) => count + PLACES_STEP),
    view === 'places' && placesShown < businesses.length,
  )
  const shownPlaces = businesses.slice(0, placesShown)
  const views = [
    // While more pages wait, the count says «24+» rather than a total it does not know yet.
    {
      value: 'services' as const,
      label: 'Услуги',
      count: feed.hasMore ? `${feed.offers.length}+` : feed.offers.length,
    },
    { value: 'places' as const, label: 'Места', count: businesses.length },
  ]

  return (
    <section className={styles.results} aria-labelledby='results-title'>
      <div className={styles.header}>
        {/* Browsing everything, the tabs say it all; a search or a kind keeps its heading. */}
        <div className={styles.titleBlock}>
          <h2 id='results-title' className={styles.title} data-quiet={!canReset || undefined}>
            {title}
          </h2>
          {searchedFor && (
            // Like a big search engine: say what was searched instead, without making a fuss.
            <p className={styles.searchedFor}>Вы искали «{searchedFor}»</p>
          )}
        </div>
        {canReset && (
          <NextLink href='/' className={styles.reset}>
            Сбросить
          </NextLink>
        )}
      </div>
      <div className={styles.toolbar}>
        {/* Two big text tabs, like «Shop by» on apple.com: first where, then what. */}
        <TextTabs
          label='Что показать'
          size='lg'
          items={views.map((item) => ({
            label: item.label,
            count: item.count,
            isActive: view === item.value,
            onSelect: () => setView(item.value),
          }))}
        />
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
            {shownPlaces.map((business, index) => (
              <Fragment key={business.slug}>
                {index === INTERLUDE_AFTER && interlude && (
                  <li className={styles.interlude}>{interlude}</li>
                )}
                <li>
                  <BusinessCard business={business} />
                </li>
              </Fragment>
            ))}
            {businesses.length <= INTERLUDE_AFTER && interlude && (
              <li className={styles.interlude}>{interlude}</li>
            )}
          </ul>
        ))}
      {view === 'places' && placesShown < businesses.length && (
        <div ref={placesEnd} className={styles.sentinel} aria-hidden />
      )}

      {view === 'services' &&
        (feed.offers.length === 0 ? (
          <p className={styles.empty}>Услуг не нашли — попробуйте другое слово.</p>
        ) : (
          <OffersFeed
            offers={feed.offers}
            sort={sort}
            interlude={interlude}
            hasMore={feed.hasMore}
            isLoading={feed.isLoading}
            onEndReached={feed.loadMore}
          />
        ))}
    </section>
  )
}

export type { ResultsView }
