import NextLink from 'next/link'
import type { Business, Catalog } from '@/common/api/types'
import { pluralize } from '@/common/utils/plural'
import { formatPrice } from '@/features/booking/bookingUtils'
import styles from './CategoryLinks.module.css'

interface CategoryLinksProps {
  business: Business
  catalog: Catalog
}

export const CategoryLinks = ({ business, catalog }: CategoryLinksProps) => {
  const items = catalog.categories
    .map((category) => {
      const inCategory = catalog.services.filter((service) => service.categoryId === category.id)

      return {
        ...category,
        count: inCategory.length,
        minPrice: Math.min(...inCategory.map((service) => service.price)),
      }
    })
    .filter((category) => category.count > 0)
  if (items.length < 2) return null

  return (
    <nav aria-label='Категории услуг' className={styles.nav}>
      <ul className={styles.list}>
        {items.map((category) => (
          <li key={category.id}>
            <NextLink href={`/${business.slug}/services#${category.id}`} className={styles.link}>
              <span className={styles.name}>{category.name}</span>
              <span className={styles.meta}>
                {pluralize(category.count, ['услуга', 'услуги', 'услуг'])} · от{' '}
                {formatPrice(category.minPrice)}
              </span>
            </NextLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
