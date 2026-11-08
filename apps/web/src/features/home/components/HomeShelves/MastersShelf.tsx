import { Avatar } from '@awaisa/ui/Avatar'
import { getCatalog } from '@/common/api/serverApi'
import { StoreCard } from '@/common/components/StoreCard/StoreCard'
import { StoreShelf } from '@/common/components/StoreShelf/StoreShelf'
import { pluralize } from '@/common/utils/plural'
import styles from './HomeShelves.module.css'

export const MastersShelf = async () => {
  const { specialists } = await getCatalog()

  return (
    <StoreShelf
      id='masters'
      title='Мастера.'
      subtitle='Выберите своего или любого свободного.'
      label='Мастера'
      size='sm'
    >
      {specialists.map((specialist) => (
        <li key={specialist.id}>
          <StoreCard
            href={`/book?specialist=${specialist.id}`}
            eyebrow={specialist.role}
            title={specialist.name}
            height='sm'
            media={<Avatar name={specialist.name} size='xl' className={styles.avatar} />}
            footer={
              <>
                <span className={styles.price}>★ {specialist.rating.toFixed(1)}</span>
                <span className={styles.muted}>
                  {pluralize(specialist.serviceIds.length, ['услуга', 'услуги', 'услуг'])}
                </span>
              </>
            }
          />
        </li>
      ))}
    </StoreShelf>
  )
}
