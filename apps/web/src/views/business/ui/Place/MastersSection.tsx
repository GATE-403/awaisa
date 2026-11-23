import { MasterCard, MasterGrid } from '@/entities/business'
import { FollowButton } from '@/features/followMaster'
import type { Business, Specialist } from '@/shared/api/types'
import styles from './Place.module.css'

interface MastersSectionProps {
  business: Business
  specialists: Specialist[]
}

// «Мастера»: the booking form's picture cards three a row (four from 640px), as on the owner's
// «Страница»; each books that master, the bell in its corner follows them.
export const MastersSection = ({ business, specialists }: MastersSectionProps) => (
  <MasterGrid>
    {specialists.map((specialist) => (
      <li key={specialist.id}>
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
  </MasterGrid>
)
