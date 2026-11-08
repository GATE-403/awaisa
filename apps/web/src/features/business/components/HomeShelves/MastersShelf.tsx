import { Avatar } from '@awaisa/ui/Avatar'
import type { Business, Specialist } from '@/common/api/types'
import { StoreCard } from '@/common/components/StoreCard/StoreCard'
import { StoreShelf } from '@/common/components/StoreShelf/StoreShelf'
import { pluralize } from '@/common/utils/plural'
import styles from './HomeShelves.module.css'

interface MastersShelfProps {
  business: Business
  specialists: Specialist[]
}

export const MastersShelf = ({ business, specialists }: MastersShelfProps) => {
  if (specialists.length === 0) return null

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
            href={`/${business.slug}/book?specialist=${specialist.id}`}
            eyebrow={specialist.role}
            title={specialist.name}
            height='sm'
            media={<Avatar name={specialist.name} size='xl' className={styles.avatar} />}
            footer={
              <>
                {specialist.rating !== null && (
                  <span className={styles.price}>★ {specialist.rating.toFixed(1)}</span>
                )}
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
