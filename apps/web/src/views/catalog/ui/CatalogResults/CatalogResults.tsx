'use client'

import { Select } from '@awaisa/ui/Select'
import NextLink from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { BusinessCard, type PlaceCardData } from '@/entities/business'
import { ForYouShelf } from '@/features/forYou'
import type { BusinessKind, FeedItem, Offer } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { useEndReached } from '@/shared/lib/hooks/useEndReached'
import { trackStep } from '@/shared/lib/telemetry'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { TextTabs } from '@/shared/ui/TextTabs/TextTabs'
import { useOfferPages } from '../../model/useOfferPages'
import { FEED_SORTS, type FeedSort, OffersFeed } from '../OffersFeed/OffersFeed'
import styles from './CatalogResults.module.css'

type ResultsView = 'places' | 'services'

/** Two rows on phones; CSS moves the shelf below two rows on wider grids too. */
/** Places are drawn a screenful at a time as the list scrolls. */
const PLACES_STEP = 24

// Fewer services found than this adds «Similar services» under them.
const FEW_RESULTS = 4

interface CatalogResultsProps {
  title: string
  /** The text actually typed when it was read as something else (a typo or the wrong keyboard layout: «hiarcut» → «haircut»). */
  searchedFor?: string
  businesses: PlaceCardData[]
  offers: Offer[]
  initialView: ResultsView
  initialSort: FeedSort
  canReset: boolean
  /** A shelf set into the grid after the first rows, like Shorts in a video feed. */
  /** The masters' work, set into the grid one at a time (`WorkTile`). */
  works?: FeedItem[]
  kind?: BusinessKind
  query?: string
}

// What first (services), then where (places) - one switch instead of two long sections.
export const CatalogResults = ({
  title,
  searchedFor,
  businesses,
  offers,
  initialView,
  initialSort,
  canReset,
  works,
  kind,
  query,
}: CatalogResultsProps) => {
  const t = useT()
  const [view, setView] = useState(initialView)
  const [sort, setSort] = useState(initialSort)
  const [placesShown, setPlacesShown] = useState(PLACES_STEP)
  const sectionRef = useRef<HTMLElement>(null)
  const isEmpty = offers.length === 0 && businesses.length === 0

  useEffect(() => {
    trackStep('catalog')
  }, [])
  // A search's results: found something or nothing, and whether a result was then opened.
  useEffect(() => {
    if (!query) return
    trackStep(isEmpty ? 'search_empty' : 'search_results')
    const section = sectionRef.current
    if (!section) return
    const handleClick = (event: MouseEvent) => {
      if ((event.target as Element | null)?.closest('a[href]'))
        trackStep('search_pick', undefined, { kind: 'result' })
    }
    section.addEventListener('click', handleClick)
    return () => section.removeEventListener('click', handleClick)
  }, [query, isEmpty])
  // The services feed pages from the server; «Soonest» re-sorts what is loaded.
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
      label: t('Services'),
      count: feed.hasMore ? `${feed.offers.length}+` : feed.offers.length,
    },
    { value: 'places' as const, label: t('Places'), count: businesses.length },
  ]

  return (
    <section ref={sectionRef} className={styles.results} aria-labelledby='results-title'>
      <div className={styles.header}>
        {/* Browsing everything, the tabs say it all; a search or a kind keeps its heading. */}
        <div className={styles.titleBlock}>
          <h2 id='results-title' className={styles.title} data-quiet={!canReset || undefined}>
            {/* A search's title is what was typed; a kind's or the default one is ours. */}
            {query ? title : t(title)}
          </h2>
          {searchedFor && (
            // Like a big search engine: say what was searched instead, without making a fuss.
            <p className={styles.searchedFor}>
              {t('You searched for “{query}”', { query: searchedFor })}
            </p>
          )}
        </div>
        {canReset && (
          <NextLink href='/' className={styles.reset}>
            {t('Reset')}
          </NextLink>
        )}
      </div>
      <div className={styles.toolbar}>
        {/* Two big text tabs, like «Shop by» on apple.com: first where, then what. */}
        <TextTabs
          label={t('What to show')}
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
            aria-label={t('Sort')}
            items={FEED_SORTS.map((item) => ({ ...item, label: t(item.label) }))}
            value={sort}
            onValueChange={(value) => value && setSort(value as FeedSort)}
            className={styles.sort}
          />
        )}
      </div>

      {view === 'places' &&
        (businesses.length === 0 ? (
          <EmptyState
            variant='inline'
            text={t('No places found. Try another category or service.')}
          />
        ) : (
          <ul
            className={styles.places}
            aria-label={t.count(businesses.length, ['place', 'places'])}
          >
            {shownPlaces.map((business) => (
              <li key={business.slug}>
                <BusinessCard business={business} />
              </li>
            ))}
          </ul>
        ))}
      {view === 'places' && placesShown < businesses.length && (
        <div ref={placesEnd} className={styles.sentinel} aria-hidden />
      )}

      {view === 'services' &&
        (feed.offers.length === 0 ? (
          <EmptyState variant='inline' text={t('No services found. Try another word.')} />
        ) : (
          <OffersFeed
            offers={feed.offers}
            sort={sort}
            works={works}
            kind={kind}
            hasMore={feed.hasMore}
            isLoading={feed.isLoading}
            onEndReached={feed.loadMore}
          />
        ))}
      {/* A search that found little: services like the first found, or for everyone when
          nothing was found, so the page does not end in an empty state. */}
      {view === 'services' && query && !feed.hasMore && feed.offers.length < FEW_RESULTS && (
        <ForYouShelf
          title='Similar services'
          likeServiceId={feed.offers[0]?.id}
          excludeServiceId={feed.offers.length === 1 ? feed.offers[0]?.id : undefined}
          isForEveryone
          surface='search'
        />
      )}
    </section>
  )
}

export type { ResultsView }
