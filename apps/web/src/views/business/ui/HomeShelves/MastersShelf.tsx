import { Avatar } from '@awaisa/ui/Avatar'
import type { Business, Specialist } from '@/shared/api/types'
import { pluralize } from '@/shared/lib/plural'
import { StoreCard } from '@/shared/ui/StoreCard/StoreCard'
import { StoreShelf } from '@/shared/ui/StoreShelf/StoreShelf'
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
            media={
              <Avatar
                name={specialist.name}
                src={specialist.photoUrl ?? undefined}
                size='xl'
                className={styles.avatar}
              />
            }
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
