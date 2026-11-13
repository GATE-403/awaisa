import { NextFreeProvider } from '@/entities/business'
import { OfferCard } from '@/entities/offer'
import type { Business, Catalog, Offer, Service } from '@/shared/api/types'
import { Container } from '@/shared/ui/Container/Container'
import styles from '../ServicesPage.module.css'
import { CategoryNav } from './CategoryNav'

interface ServicesCatalogProps {
  business: Business
  catalog: Catalog
  /** A work photo per service; the place's cover stands in otherwise. */
  servicePhotos: Record<string, string>
}

// The whole menu as the catalog's picture cards, by category under a sticky bar: the same card
// everywhere, the work photo of that service when there is one, one tap to book it.
export const ServicesCatalog = ({ business, catalog, servicePhotos }: ServicesCatalogProps) => {
  const groups = catalog.categories
    .map((category) => ({
      ...category,
      services: catalog.services.filter((service) => service.categoryId === category.id),
    }))
    .filter((category) => category.services.length > 0)
  const rated = catalog.specialists.filter((specialist) => specialist.rating !== null)
  const rating =
    rated.length > 0
      ? rated.reduce((sum, specialist) => sum + (specialist.rating ?? 0), 0) / rated.length
      : null
  const toOffer = (service: Service): Offer => ({
    id: service.id,
    name: service.name,
    price: service.price,
    durationMinutes: service.durationMinutes,
    isPopular: service.isPopular,
    slug: business.slug,
    businessName: business.name,
    kind: business.kind,
    coverUrl: servicePhotos[service.id] ?? business.coverUrl ?? null,
    rating,
    address: business.address ?? null,
    discountPercent: null,
  })

  return (
    <NextFreeProvider slugs={[business.slug]}>
      <CategoryNav items={groups.map(({ id, name }) => ({ id, name }))} />

      <Container className={styles.groups}>
        {groups.map((category) => (
          <section key={category.id} id={category.id} aria-labelledby={`${category.id}-title`}>
            <h2 id={`${category.id}-title`} className={styles.groupTitle}>
              {category.name}
              <span className={styles.groupCount}>{category.services.length}</span>
            </h2>
            <ul className={styles.cards}>
              {category.services.map((service) => (
                <li key={service.id}>
                  <OfferCard offer={toOffer(service)} isHit={service.isPopular} isPlaceHidden />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </Container>
    </NextFreeProvider>
  )
}
