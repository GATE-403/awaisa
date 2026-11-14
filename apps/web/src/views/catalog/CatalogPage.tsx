import { CaretRight, Trophy } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { Suspense } from 'react'
import { NextFreeProvider } from '@/entities/business'
import { ForYouShelf } from '@/features/forYou'
import { listBusinesses, listFeed, listOffers, listPopularServices } from '@/shared/api/serverApi'
import type { BusinessKind } from '@/shared/api/types'
import { BUSINESS_KINDS } from '@/shared/config/platform'
import { PageSkeleton } from '@/shared/ui/PageSkeleton/PageSkeleton'
import styles from './CatalogPage.module.css'
import { CatalogResults } from './ui/CatalogResults/CatalogResults'
import type { FeedSort } from './ui/OffersFeed/OffersFeed'
import { SearchChips } from './ui/SearchChips/SearchChips'
import { WorkShelf } from './ui/WorkShelf/WorkShelf'

interface CatalogPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const toKind = (value: unknown) =>
  BUSINESS_KINDS.find((item) => item.value === value)?.value as BusinessKind | undefined

const toQuery = (value: unknown) => (typeof value === 'string' ? value.trim().slice(0, 80) : '')

const toSort = (value: unknown): FeedSort =>
  value === 'price' || value === 'soon' ? value : 'popular'

// Data comes from the server cache ('use cache'); the query string makes this part dynamic,
// so it streams into the prerendered shell (Partial Prerendering).
const CatalogContent = async ({ searchParams }: CatalogPageProps) => {
  const params = await searchParams
  const kind = toKind(params.kind)
  const query = toQuery(params.q)
  const isBrowsing = !query
  const [businesses, offers, popular, works] = await Promise.all([
    listBusinesses(kind, query || undefined),
    listOffers(kind, query || undefined, params.sort === 'price' ? 'price' : 'popular'),
    isBrowsing ? listPopularServices(kind) : Promise.resolve([]),
    // The shelf is a nice-to-have: the catalog renders without it.
    isBrowsing ? listFeed(kind, undefined, undefined).catch(() => null) : Promise.resolve(null),
  ])
  const slugs = [...new Set([...businesses, ...offers].map((item) => item.slug))]
  // A search for a place's name shows places first; a search for a service shows services.
  const needle = query.toLocaleLowerCase('ru')
  const matchesPlace = businesses.some((business) =>
    business.name.toLocaleLowerCase('ru').includes(needle),
  )
  const kindLabel = BUSINESS_KINDS.find((item) => item.value === kind)?.label

  return (
    <NextFreeProvider slugs={slugs}>
      <div className={styles.contained}>
        {/* Picked for this client (or, with nothing known, popular and free soon) leads the page. */}
        {isBrowsing && !kind && <ForYouShelf isForEveryone />}
        {isBrowsing && (
          // The leaderboards, one quiet line: who is best by reviews, masters and places.
          <NextLink href={kind ? `/top?kind=${kind}` : '/top'} className={styles.topLink}>
            <Trophy weight='fill' aria-hidden className={styles.topIcon} />
            <span className={styles.topText}>
              <strong>Рейтинг</strong> лучших мастеров и мест по отзывам
            </span>
            <CaretRight weight='bold' aria-hidden className={styles.topChevron} />
          </NextLink>
        )}
        {isBrowsing && <SearchChips kind={kind} services={popular} />}
        <CatalogResults
          key={`${kind ?? ''}|${query}`}
          kind={kind}
          query={query || undefined}
          title={query ? `«${query}»` : (kindLabel ?? 'Куда записаться')}
          businesses={businesses}
          offers={offers}
          initialView={!query || matchesPlace ? 'places' : 'services'}
          initialSort={toSort(params.sort)}
          canReset={Boolean(query || kind)}
          interlude={
            // Set into the grid after two rows, like Shorts in a feed: the masters' work.
            isBrowsing && works ? <WorkShelf items={works.items} kind={kind} /> : undefined
          }
        />
      </div>
    </NextFreeProvider>
  )
}

// A marketplace, not a landing: search, categories, offers, then the places themselves.
export const CatalogPage = ({ searchParams }: CatalogPageProps) => (
  <main className={styles.page}>
    <Suspense fallback={<PageSkeleton />}>
      <CatalogContent searchParams={searchParams} />
    </Suspense>
  </main>
)
