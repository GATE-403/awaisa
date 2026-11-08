import NextLink from 'next/link'
import { listBusinesses } from '@/common/api/serverApi'
import type { BusinessKind } from '@/common/api/types'
import { StoreCard } from '@/common/components/StoreCard/StoreCard'
import { pluralize } from '@/common/utils/plural'
import { getKindLabel } from '@/constants/platform'
import { formatPrice } from '@/features/booking/bookingUtils'
import styles from '../CatalogPage.module.css'

interface BusinessGridProps {
  kind: BusinessKind | undefined
  query: string
}

export const BusinessGrid = async ({ kind, query }: BusinessGridProps) => {
  const businesses = await listBusinesses(kind, query || undefined)

  return (
    <section aria-labelledby='catalog-results' className={styles.results}>
      <h2 id='catalog-results' className={styles.resultsTitle}>
        {query ? `Найдено: ${businesses.length}` : 'Куда записаться.'}
        {!query && <span className={styles.titleMuted}> Свободное время — онлайн.</span>}
      </h2>

      {businesses.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Ничего не нашли</p>
          <p className={styles.emptyText}>Попробуйте другое слово или уберите фильтр.</p>
          <NextLink href='/' className={styles.emptyLink}>
            Показать все
          </NextLink>
        </div>
      ) : (
        <ul className={styles.grid}>
          {businesses.map((business) => (
            <li key={business.slug}>
              <StoreCard
                href={`/${business.slug}`}
                eyebrow={getKindLabel(business.kind)}
                title={business.name}
                description={business.description || business.address}
                height='sm'
                footer={
                  <>
                    <span className={styles.price}>от {formatPrice(business.minPrice)}</span>
                    <span className={styles.muted}>
                      {[
                        pluralize(business.servicesCount, ['услуга', 'услуги', 'услуг']),
                        business.address,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </>
                }
              />
            </li>
          ))}
        </ul>
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
