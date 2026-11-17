import NextLink from 'next/link'
import { MasterCard } from '@/entities/business'
import type { Business, Specialist } from '@/shared/api/types'
import styles from './Place.module.css'

interface MastersSectionProps {
  business: Business
  specialists: Specialist[]
}

// Masters as picture cards (`MasterCard`: the photo, or the mascot on their own colour); each
// books that master.
export const MastersSection = ({ business, specialists }: MastersSectionProps) => {
  if (specialists.length === 0) return null

  return (
    <section id='masters' className={styles.section} aria-labelledby='place-masters'>
      <div className={styles.sectionHead}>
        <h2 id='place-masters' className={styles.sectionTitle}>
          Мастера
        </h2>
        <span className={styles.sectionCount}>{specialists.length}</span>
        <NextLink
          href={business.kind === 'barber' ? '/top' : `/top?kind=${business.kind}`}
          className={styles.sectionLink}
        >
          Рейтинг ›
        </NextLink>
      </div>
      <ul className={styles.masters} data-edge-fade=''>
        {specialists.map((specialist) => (
          <li key={specialist.id}>
            <MasterCard
              specialist={specialist}
              href={`/${business.slug}/book?specialist=${specialist.id}`}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
