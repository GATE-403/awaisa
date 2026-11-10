import { CaretRight } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { formatDuration, formatPrice } from '@/entities/booking'
import type { Business, Catalog } from '@/shared/api/types'
import styles from './Place.module.css'

interface ServicesSectionProps {
  business: Business
  catalog: Catalog
}

const LIMIT = 12

// The price list itself, grouped like Settings: every row books that service.
export const ServicesSection = ({ business, catalog }: ServicesSectionProps) => {
  let shown = 0
  const groups = catalog.categories
    .map((category) => {
      const services = catalog.services
        .filter((service) => service.categoryId === category.id)
        .sort((first, second) => Number(second.isPopular) - Number(first.isPopular))
        .slice(0, Math.max(0, LIMIT - shown))
      shown += services.length
      return { category, services }
    })
    .filter((group) => group.services.length > 0)

  if (groups.length === 0) return null

  return (
    <section id='services' className={styles.section} aria-labelledby='place-services'>
      <div className={styles.sectionHead}>
        <h2 id='place-services' className={styles.sectionTitle}>
          Услуги и цены
        </h2>
        {catalog.services.length > shown && (
          <NextLink href={`/${business.slug}/services`} className={styles.sectionLink}>
            Все {catalog.services.length}
            <CaretRight weight='bold' aria-hidden />
          </NextLink>
        )}
      </div>
      {groups.map(({ category, services }) => (
        <div key={category.id} className={styles.group}>
          {groups.length > 1 && <h3 className={styles.groupTitle}>{category.name}</h3>}
          <ul className={styles.list}>
            {services.map((service) => (
              <li key={service.id}>
                <NextLink
                  href={`/${business.slug}/book?service=${service.id}`}
                  className={styles.serviceRow}
                >
                  <span className={styles.rowText}>
                    <span className={styles.rowTitle}>
                      {service.name}
                      {service.isPopular && <span className={styles.hit}>Хит</span>}
                    </span>
                    <span className={styles.rowMeta}>
                      {formatDuration(service.durationMinutes)}
                      {service.description && ` · ${service.description}`}
                    </span>
                  </span>
                  <span className={styles.rowPrice}>{formatPrice(service.price)}</span>
                  <CaretRight weight='bold' aria-hidden className={styles.chevron} />
                </NextLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
