import { Suspense } from 'react'
import { BusinessCard, NextFreeProvider } from '@/entities/business'
import { listBusinesses, listOffers, listPopularServices } from '@/shared/api/serverApi'
import type { BusinessKind } from '@/shared/api/types'
import { BUSINESS_KINDS } from '@/shared/config/platform'
import { PageSkeleton } from '@/shared/ui/PageSkeleton/PageSkeleton'
import { StoreShelf } from '@/shared/ui/StoreShelf/StoreShelf'
import styles from './CatalogPage.module.css'
import { BusinessGrid } from './ui/BusinessGrid'
import { CategoryTiles } from './ui/CategoryTiles/CategoryTiles'
import { HeroCarousel } from './ui/HeroCarousel/HeroCarousel'
import { type FeedSort, OffersFeed } from './ui/OffersFeed/OffersFeed'
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
  const [all, businesses, offers, popular] = await Promise.all([
    listBusinesses(undefined, query || undefined),
    listBusinesses(kind, query || undefined),
    listOffers(kind, query || undefined),
    isBrowsing ? listPopularServices(kind) : Promise.resolve([]),
  ])
  const slugs = [...new Set([...businesses, ...offers].map((item) => item.slug))]
  const kindLabel = BUSINESS_KINDS.find((item) => item.value === kind)?.label

  return (
    <NextFreeProvider slugs={slugs}>
      <div className={styles.contained}>
        <CategoryTiles kind={kind} query={query} all={all} />
        {isBrowsing && <SearchChips kind={kind} services={popular} />}
        {isBrowsing && !kind && <HeroCarousel offers={offers} />}
        {offers.length > 0 && (
          <OffersFeed
            title={query ? `«${query}»` : (kindLabel ?? 'Услуги для вас')}
            offers={offers}
            initialSort={toSort(params.sort)}
          />
        )}
      </div>

      {isBrowsing && businesses.length > 0 ? (
        <StoreShelf title='Места.' subtitle='Салоны и мастера с онлайн-записью.' label='Места'>
          {businesses.map((business) => (
            <li key={business.slug}>
              <BusinessCard business={business} />
            </li>
          ))}
        </StoreShelf>
      ) : (
        <div className={styles.contained}>
          <BusinessGrid kind={kind} query={query} businesses={businesses} />
        </div>
      )}
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
