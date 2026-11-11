import { Avatar } from '@awaisa/ui/Avatar'
import { Fire } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { formatDuration, formatPrice } from '@/entities/booking'
import type { Business, Catalog } from '@/shared/api/types'
import { pluralize } from '@/shared/lib/plural'
import { Container } from '@/shared/ui/Container/Container'
import styles from '../ServicesPage.module.css'
import { CategoryNav } from './CategoryNav'

interface ServicesCatalogProps {
  business: Business
  catalog: Catalog
}

const MAX_AVATARS = 3

// Services as cards you can act on: what it is, how long, who does it, the price, one tap to book.
export const ServicesCatalog = ({ business, catalog }: ServicesCatalogProps) => {
  const groups = catalog.categories
    .map((category) => ({
      ...category,
      services: catalog.services.filter((service) => service.categoryId === category.id),
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
              <span className={styles.groupCount}>{category.services.length}</span>
            </h2>
            <ul className={styles.cards}>
              {category.services.map((service) => {
                const masters = catalog.specialists.filter((specialist) =>
                  specialist.serviceIds.includes(service.id),
                )

                return (
                  <li key={service.id}>
                    <NextLink
                      href={`/${business.slug}/book?service=${service.id}`}
                      className={styles.card}
                    >
                      <span className={styles.cardTop}>
                        <span className={styles.name}>{service.name}</span>
                        {service.isPopular && (
                          <span className={styles.hit} role='img' aria-label='Хит' title='Хит'>
                            <Fire weight='fill' aria-hidden />
                          </span>
                        )}
                      </span>
                      {service.description && (
                        <span className={styles.description}>{service.description}</span>
                      )}
                      <span className={styles.details}>
                        <span className={styles.chip}>
                          {formatDuration(service.durationMinutes)}
                        </span>
                        {masters.length > 0 && (
                          <span className={styles.masters}>
                            <span className={styles.avatars} aria-hidden='true'>
                              {masters.slice(0, MAX_AVATARS).map((master) => (
                                <Avatar
                                  key={master.id}
                                  name={master.name}
                                  src={master.photoUrl ?? undefined}
                                  size='sm'
                                  className={styles.avatar}
                                />
                              ))}
                            </span>
                            {pluralize(masters.length, ['мастер', 'мастера', 'мастеров'])}
                          </span>
                        )}
                      </span>
                      <span className={styles.cardBottom}>
                        <span className={styles.price}>{formatPrice(service.price)}</span>
                        <span className={styles.book}>Записаться</span>
                      </span>
                    </NextLink>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </Container>
    </>
  )
}
