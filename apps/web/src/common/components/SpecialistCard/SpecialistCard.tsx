import { Avatar } from '@awaisa/ui/Avatar'
import { Star } from 'lucide-react'
import NextLink from 'next/link'
import type { Specialist } from '@/common/api/types'
import styles from './SpecialistCard.module.css'

interface SpecialistCardProps {
  specialist: Specialist
}

export const SpecialistCard = ({ specialist }: SpecialistCardProps) => (
  <NextLink href={`/book?specialist=${specialist.id}`} className={styles.card}>
    <Avatar name={specialist.name} size='lg' />
    <span className={styles.body}>
      <span className={styles.name}>{specialist.name}</span>
      <span className={styles.role}>{specialist.role}</span>
      <span className={styles.rating}>
        <Star className={styles.star} aria-hidden />
        {specialist.rating.toFixed(1)}
      </span>
    </span>
  </NextLink>
)
