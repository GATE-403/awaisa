import { formatDuration, formatPrice } from '@/entities/booking'
import type { Business, Catalog } from '@/shared/api/types'
import { StoreCard } from '@/shared/ui/StoreCard/StoreCard'
import { StoreShelf } from '@/shared/ui/StoreShelf/StoreShelf'
import styles from './HomeShelves.module.css'

interface PopularShelfProps {
  business: Business
  catalog: Catalog
}

export const PopularShelf = ({
  business,
  catalog: { categories, services },
}: PopularShelfProps) => {
  const marked = services.filter((service) => service.isPopular)
  const popular = marked.length > 0 ? marked : services
  if (popular.length === 0) return null
  const getCategoryName = (categoryId: string) =>
    categories.find((category) => category.id === categoryId)?.name

  return (
    <StoreShelf
      id='popular'
      title={marked.length > 0 ? 'Популярное.' : 'Услуги.'}
      subtitle={marked.length > 0 ? 'Чаще всего записываются сюда.' : 'Выберите, с чего начать.'}
      label='Популярные услуги'
    >
      {popular.map((service, index) => (
        <li key={service.id}>
          <StoreCard
            href={`/${business.slug}/book?service=${service.id}`}
            eyebrow={service.isPopular && index === 0 ? 'Хит' : getCategoryName(service.categoryId)}
            isHighlighted={service.isPopular && index === 0}
            title={service.name}
            description={service.description}
            footer={
              <>
                <span className={styles.price}>{formatPrice(service.price)}</span>
                <span className={styles.muted}>{formatDuration(service.durationMinutes)}</span>
              </>
            }
          />
        </li>
      ))}
    </StoreShelf>
  )
}
