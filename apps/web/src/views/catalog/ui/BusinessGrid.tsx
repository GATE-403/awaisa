import NextLink from 'next/link'
import { BusinessCard } from '@/entities/business'
import type { BusinessCard as BusinessCardData, BusinessKind } from '@/shared/api/types'
import { getKindLabel } from '@/shared/config/platform'
import { pluralize } from '@/shared/lib/plural'
import styles from '../CatalogPage.module.css'

interface BusinessGridProps {
  kind: BusinessKind | undefined
  query: string
  businesses: BusinessCardData[]
}

export const BusinessGrid = ({ kind, query, businesses }: BusinessGridProps) => (
  <section aria-labelledby='catalog-results' className={styles.results}>
    <div className={styles.resultsHeader}>
      <h2 id='catalog-results' className={styles.resultsTitle}>
        {query ? 'Места' : kind ? getKindLabel(kind) : 'Все места'}
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
      <ul className={styles.grid}>
        {businesses.map((business) => (
          <li key={business.slug}>
            <BusinessCard business={business} />
          </li>
        ))}
      </ul>
    )}
  </section>
)
