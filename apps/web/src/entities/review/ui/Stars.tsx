'use client'

import { useLingui } from '@lingui/react/macro'
import { Star } from '@phosphor-icons/react/ssr'
import styles from './ReviewItem.module.css'

interface StarsProps {
  rating: number
}

// Five small stars, the given number filled; read as «4 of 5».
export const Stars = ({ rating }: StarsProps) => {
  const { t } = useLingui()

  return (
    <span className={styles.stars} role='img' aria-label={t`${rating} of 5`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star key={value} weight={value <= Math.round(rating) ? 'fill' : 'regular'} aria-hidden />
      ))}
    </span>
  )
}
