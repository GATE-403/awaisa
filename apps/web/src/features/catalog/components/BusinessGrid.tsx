import NextLink from 'next/link'
import type { BusinessCard, BusinessKind } from '@/common/api/types'
import { pluralize } from '@/common/utils/plural'
import { getKindLabel } from '@/constants/platform'
import styles from '../CatalogPage.module.css'
import { NextFreeProvider } from './BusinessCard/NextFreeProvider'
import { type CatalogSort, SortedGrid } from './SortedGrid/SortedGrid'

interface BusinessGridProps {
  kind: BusinessKind | undefined
  query: string
  sort: CatalogSort
  businesses: BusinessCard[]
}

export const BusinessGrid = ({ kind, query, sort, businesses }: BusinessGridProps) => (
  <section aria-labelledby='catalog-results' className={styles.results}>
    <div className={styles.resultsHeader}>
      <h2 id='catalog-results' className={styles.resultsTitle}>
        {query ? `«${query}»` : kind ? getKindLabel(kind) : 'Все места'}
        <span className={styles.count}>
          {pluralize(businesses.length, ['место', 'места', 'мест'])}
        </span>
      </h2>
      {(query || kind) && (
        <NextLink href='/' className={styles.reset}>
          Сбросить
        </NextLink>
      )}
    </div>

    {businesses.length === 0 ? (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>Ничего не нашли</p>
        <p className={styles.emptyText}>Попробуйте другую услугу или уберите фильтр.</p>
        <NextLink href='/' className={styles.emptyLink}>
          Показать все места
        </NextLink>
      </div>
    ) : (
      <NextFreeProvider slugs={businesses.map((business) => business.slug)}>
        <SortedGrid businesses={businesses} initialSort={sort} />
      </NextFreeProvider>
    )}
  </section>
)
