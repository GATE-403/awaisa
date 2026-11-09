import { Suspense } from 'react'
import { listBusinesses, listPopularServices } from '@/common/api/serverApi'
import type { BusinessKind } from '@/common/api/types'
import { PageSkeleton } from '@/common/components/PageSkeleton/PageSkeleton'
import { BUSINESS_KINDS } from '@/constants/platform'
import styles from './CatalogPage.module.css'
import { BusinessGrid } from './components/BusinessGrid'
import { CatalogHeader } from './components/CatalogHeader/CatalogHeader'
import { CategoryTiles } from './components/CategoryTiles/CategoryTiles'
import { PopularServices } from './components/PopularServices/PopularServices'
import { PromoBanners } from './components/PromoBanners/PromoBanners'
import type { CatalogSort } from './components/SortedGrid/SortedGrid'

interface CatalogPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const toKind = (value: unknown) =>
  BUSINESS_KINDS.find((item) => item.value === value)?.value as BusinessKind | undefined

const toQuery = (value: unknown) => (typeof value === 'string' ? value.trim().slice(0, 80) : '')

const toSort = (value: unknown): CatalogSort =>
  value === 'price' || value === 'soon' ? value : 'recommended'

const CatalogContent = async ({ searchParams }: CatalogPageProps) => {
  const params = await searchParams
  const kind = toKind(params.kind)
  const query = toQuery(params.q)
  const isBrowsing = !query
  const [all, businesses, popular] = await Promise.all([
    listBusinesses(undefined, query || undefined),
    listBusinesses(kind, query || undefined),
    isBrowsing ? listPopularServices(kind) : Promise.resolve([]),
  ])

  return (
    <>
      <div className={styles.contained}>
        <CatalogHeader kind={kind} query={query} />
        <CategoryTiles kind={kind} query={query} all={all} />
      </div>
      {isBrowsing && !kind && <PromoBanners />}
      {isBrowsing && <PopularServices kind={kind} services={popular} />}
      <div className={styles.contained}>
        <BusinessGrid
          kind={kind}
          query={query}
          sort={toSort(params.sort)}
          businesses={businesses}
        />
      </div>
    </>
  )
}

// A marketplace, not a landing: search, categories, offers and the places themselves.
export const CatalogPage = ({ searchParams }: CatalogPageProps) => (
  <main className={styles.page}>
    <Suspense fallback={<PageSkeleton />}>
      <CatalogContent searchParams={searchParams} />
    </Suspense>
  </main>
)
