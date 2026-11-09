import NextLink from 'next/link'
import { listBusinesses } from '@/common/api/serverApi'
import type { BusinessKind } from '@/common/api/types'
import { StoreCard } from '@/common/components/StoreCard/StoreCard'
import { pluralize } from '@/common/utils/plural'
import styles from '../CatalogPage.module.css'
import { BusinessCard } from './BusinessCard/BusinessCard'
import { NextFreeProvider } from './BusinessCard/NextFreeProvider'

interface BusinessGridProps {
  kind: BusinessKind | undefined
  query: string
}

export const BusinessGrid = async ({ kind, query }: BusinessGridProps) => {
  const businesses = await listBusinesses(kind, query || undefined)

  return (
    <section aria-labelledby='catalog-results' className={styles.results}>
      <h2 id='catalog-results' className={styles.resultsTitle}>
        {query ? `«${query}».` : 'Куда записаться.'}
        <span className={styles.titleMuted}>
          {query
            ? ` ${pluralize(businesses.length, ['результат', 'результата', 'результатов'])}.`
            : ' Свободное время — онлайн.'}
        </span>
      </h2>
      {query && (
        <NextLink href={kind ? `/?kind=${kind}` : '/'} className={styles.emptyLink}>
          Сбросить поиск
        </NextLink>
      )}

      {businesses.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Ничего не нашли</p>
          <p className={styles.emptyText}>Попробуйте другое слово или уберите фильтр.</p>
          <NextLink href='/' className={styles.emptyLink}>
            Показать все
          </NextLink>
        </div>
      ) : (
        <NextFreeProvider slugs={businesses.map((business) => business.slug)}>
          <ul className={styles.grid}>
            {businesses.map((business) => (
              <li key={business.slug}>
                <BusinessCard business={business} />
              </li>
            ))}
          </ul>
        </NextFreeProvider>
      )}

      <StoreCard
        href='/business'
        tone='dark'
        height='auto'
        eyebrow='Для бизнеса'
        title='Принимайте записи онлайн.'
        description='Страница с услугами, мастерами и графиком за пять минут. Клиенты записываются сами — вы получаете расписание.'
        className={styles.promo}
      />
    </section>
  )
}
