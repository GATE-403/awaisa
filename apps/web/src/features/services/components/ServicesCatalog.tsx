import { CaretRight } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import type { Business, Catalog } from '@/common/api/types'
import { Container } from '@/common/components/Container/Container'
import { formatDuration, formatPrice } from '@/features/booking/bookingUtils'
import styles from '../ServicesPage.module.css'
import { CategoryNav } from './CategoryNav'

interface ServicesCatalogProps {
  business: Business
  catalog: Catalog
}

export const ServicesCatalog = ({
  business,
  catalog: { categories, services },
}: ServicesCatalogProps) => {
  const groups = categories
    .map((category) => ({
      ...category,
      services: services.filter((service) => service.categoryId === category.id),
    }))
    .filter((category) => category.services.length > 0)

  return (
    <>
      <CategoryNav items={groups.map(({ id, name }) => ({ id, name }))} />

      <Container className={styles.groups}>
        {groups.map((category) => (
          <section key={category.id} id={category.id} aria-labelledby={`${category.id}-title`}>
            <h2 id={`${category.id}-title`} className={styles.groupTitle}>
              {category.name}
            </h2>
            <ul className={styles.list}>
              {category.services.map((service) => (
                <li key={service.id}>
                  <NextLink
                    href={`/${business.slug}/book?service=${service.id}`}
                    className={styles.row}
                  >
                    <span className={styles.rowBody}>
                      <span className={styles.name}>{service.name}</span>
                      <span className={styles.description}>{service.description}</span>
                    </span>
                    <span className={styles.meta}>
                      <span className={styles.price}>{formatPrice(service.price)}</span>
                      <br />
                      {formatDuration(service.durationMinutes)}
                    </span>
                    <CaretRight className={styles.chevron} weight='bold' aria-hidden />
                  </NextLink>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </Container>
    </>
  )
}
