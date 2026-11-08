import NextLink from 'next/link'
import { getCatalog } from '@/common/api/serverApi'
import { pluralize } from '@/common/utils/plural'
import { formatPrice } from '@/features/booking/bookingUtils'
import styles from './CategoryLinks.module.css'

export const CategoryLinks = async () => {
  const { categories, services } = await getCatalog()
  const items = categories
    .map((category) => {
      const inCategory = services.filter((service) => service.categoryId === category.id)

      return {
        ...category,
        count: inCategory.length,
        minPrice: Math.min(...inCategory.map((service) => service.price)),
      }
    })
    .filter((category) => category.count > 0)

  return (
    <nav aria-label='Категории услуг' className={styles.nav}>
      <ul className={styles.list}>
        {items.map((category) => (
          <li key={category.id}>
            <NextLink href={`/services#${category.id}`} className={styles.link}>
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
