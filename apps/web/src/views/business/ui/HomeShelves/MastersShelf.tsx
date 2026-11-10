import { Avatar } from '@awaisa/ui/Avatar'
import { Star } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import type { Business, Specialist } from '@/shared/api/types'
import { pluralize } from '@/shared/lib/plural'
import { StoreShelf } from '@/shared/ui/StoreShelf/StoreShelf'
import styles from './HomeShelves.module.css'

interface MastersShelfProps {
  business: Business
  specialists: Specialist[]
}

// Masters as contact rows (photo, name, role, rating) — compact, like a Contacts card.
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
          <NextLink
            href={`/${business.slug}/book?specialist=${specialist.id}`}
            className={styles.master}
          >
            <Avatar
              name={specialist.name}
              src={specialist.photoUrl ?? undefined}
              size='lg'
              className={styles.masterAvatar}
            />
            <span className={styles.masterText}>
              <span className={styles.masterName}>{specialist.name}</span>
              <span className={styles.masterRole}>{specialist.role || 'Мастер'}</span>
              <span className={styles.masterMeta}>
                {specialist.rating !== null && (
                  <span className={styles.masterRating}>
                    <Star weight='fill' aria-hidden />
                    {specialist.rating.toFixed(1)}
                  </span>
                )}
                {pluralize(specialist.serviceIds.length, ['услуга', 'услуги', 'услуг'])}
              </span>
            </span>
          </NextLink>
        </li>
      ))}
    </StoreShelf>
  )
}
