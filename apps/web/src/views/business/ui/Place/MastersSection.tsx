import { Avatar } from '@awaisa/ui/Avatar'
import { Star } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import type { Business, Specialist } from '@/shared/api/types'
import { pluralize } from '@/shared/lib/plural'
import styles from './Place.module.css'

interface MastersSectionProps {
  business: Business
  specialists: Specialist[]
}

// Contact-style tiles: a face first, then name, role and rating; each books that master.
export const MastersSection = ({ business, specialists }: MastersSectionProps) => {
  if (specialists.length === 0) return null

  return (
    <section id='masters' className={styles.section} aria-labelledby='place-masters'>
      <div className={styles.sectionHead}>
        <h2 id='place-masters' className={styles.sectionTitle}>
          Мастера
        </h2>
      </div>
      <ul className={styles.masters}>
        {specialists.map((specialist) => (
          <li key={specialist.id}>
            <NextLink
              href={`/${business.slug}/book?specialist=${specialist.id}`}
              className={styles.master}
            >
              <Avatar
                name={specialist.name}
                src={specialist.photoUrl ?? undefined}
                size='xl'
                className={styles.masterAvatar}
              />
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
            </NextLink>
          </li>
        ))}
      </ul>
    </section>
  )
}
