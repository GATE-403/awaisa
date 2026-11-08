import { getCatalog } from '@/common/api/serverApi'
import { StoreCard } from '@/common/components/StoreCard/StoreCard'
import { StoreShelf } from '@/common/components/StoreShelf/StoreShelf'
import { formatDuration, formatPrice } from '@/features/booking/bookingUtils'
import styles from './HomeShelves.module.css'

export const PopularShelf = async () => {
  const { categories, services } = await getCatalog()
  const popular = services.filter((service) => service.isPopular)
  const getCategoryName = (categoryId: string) =>
    categories.find((category) => category.id === categoryId)?.name

  return (
    <StoreShelf
      id='popular'
      title='Популярное.'
      subtitle='Чаще всего записываются сюда.'
      label='Популярные услуги'
    >
      {popular.map((service, index) => (
        <li key={service.id}>
          <StoreCard
            href={`/book?service=${service.id}`}
            eyebrow={index === 0 ? 'Хит' : getCategoryName(service.categoryId)}
            isHighlighted={index === 0}
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
