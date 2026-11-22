import NextLink from 'next/link'
import { MasterCard } from '@/entities/business'
import { FollowButton } from '@/features/followMaster'
import type { Business, Specialist } from '@/shared/api/types'
import { T } from '@/shared/i18n'
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
          <T>Мастера</T>
        </h2>
        <span className={styles.sectionCount}>{specialists.length}</span>
        <NextLink
          href={business.kind === 'barber' ? '/top' : `/top?kind=${business.kind}`}
          className={styles.sectionLink}
        >
          <T>Рейтинг ›</T>
        </NextLink>
      </div>
      <ul className={styles.masters} data-edge-fade=''>
        {specialists.map((specialist) => (
          <li key={specialist.id} className={styles.masterItem}>
            <MasterCard
              specialist={specialist}
              href={`/${business.slug}/book?specialist=${specialist.id}`}
            />
            <span className={styles.masterFollow}>
              <FollowButton
                specialistId={specialist.id}
                name={specialist.name.split(' ')[0] ?? specialist.name}
                variant='glyph'
              />
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
