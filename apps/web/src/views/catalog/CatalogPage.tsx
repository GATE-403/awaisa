import NextLink from 'next/link'
import { Suspense } from 'react'
import { NextFreeProvider, toPlaceCard } from '@/entities/business'
import { ForYouShelf } from '@/features/forYou'
import {
  listBusinesses,
  listFeed,
  listOffers,
  listPopularServices,
  resolveSearch,
} from '@/shared/api/serverApi'
import type { BusinessKind } from '@/shared/api/types'
import { BUSINESS_KINDS } from '@/shared/config/platform'
import styles from './CatalogPage.module.css'
import { CatalogResults } from './ui/CatalogResults/CatalogResults'
import { CatalogSkeleton } from './ui/CatalogSkeleton/CatalogSkeleton'
import { FirstVisitNote } from './ui/FirstVisitNote/FirstVisitNote'
import type { FeedSort } from './ui/OffersFeed/OffersFeed'
import { SearchChips } from './ui/SearchChips/SearchChips'

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
  const [businesses, offers, popular, works, resolved] = await Promise.all([
    listBusinesses(kind, query || undefined),
    listOffers(kind, query || undefined, params.sort === 'price' ? 'price' : 'popular'),
    isBrowsing ? listPopularServices(kind) : Promise.resolve([]),
    // The shelf is a nice-to-have: the catalog renders without it.
    // Two pages of work (24), enough for several mosaic blocks down the grid.
    isBrowsing
      ? Promise.all([
          listFeed(kind, undefined, undefined),
          listFeed(kind, undefined, undefined, 12).catch(() => null),
        ])
          .then(([first, second]) => ({
            ...first,
            items: [...first.items, ...(second?.items ?? [])].filter(
              (item, index, all) => all.findIndex((other) => other.id === item.id) === index,
            ),
          }))
          .catch(() => null)
      : Promise.resolve(null),
    // Typos, the wrong keyboard layout or Latin letters: the API searched something else.
    query ? resolveSearch(query) : Promise.resolve(null),
  ])
  const shown = resolved?.corrected ?? query
  const slugs = [...new Set([...businesses, ...offers].map((item) => item.slug))]
  // People come to book a service, so services lead; a search for a place's name opens places.
  const needle = shown.toLocaleLowerCase('ru')
  const matchesPlace = businesses.some((business) =>
    business.name.toLocaleLowerCase('ru').includes(needle),
  )
  const kindLabel = BUSINESS_KINDS.find((item) => item.value === kind)?.label

  return (
    <NextFreeProvider slugs={slugs}>
      <div className={styles.contained}>
        {/* Picked for this client (or, with nothing known, popular and free soon) leads the page. */}
        {isBrowsing && !kind && <FirstVisitNote />}
        {isBrowsing && !kind && (
          <ForYouShelf
            isForEveryone
            headAction={
              <NextLink href='/top' className={styles.topLink}>
                Рейтинг ›
              </NextLink>
            }
          />
        )}
        {isBrowsing && <SearchChips kind={kind} services={popular} />}
        <CatalogResults
          key={`${kind ?? ''}|${query}`}
          kind={kind}
          query={query || undefined}
          title={query ? `«${shown}»` : (kindLabel ?? 'Куда записаться')}
          searchedFor={resolved?.corrected ? query : undefined}
          businesses={businesses.map(toPlaceCard)}
          offers={offers}
          initialView={query && matchesPlace ? 'places' : 'services'}
          initialSort={toSort(params.sort)}
          canReset={Boolean(query || kind)}
          // The masters' work, set into the grid Instagram Explore style, block after block.
          works={isBrowsing && works ? works.items : undefined}
        />
      </div>
    </NextFreeProvider>
  )
}

// A marketplace, not a landing: search, categories, offers, then the places themselves.
export const CatalogPage = ({ searchParams }: CatalogPageProps) => (
  <main className={styles.page}>
    <Suspense fallback={<CatalogSkeleton />}>
      <CatalogContent searchParams={searchParams} />
    </Suspense>
  </main>
)
