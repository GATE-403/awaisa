'use client'

import { Star } from '@phosphor-icons/react/ssr'
import { useT } from '@/shared/i18n'
import styles from './ReviewItem.module.css'

interface StarsProps {
  rating: number
}

// Five small stars, the given number filled; read as «4 из 5».
export const Stars = ({ rating }: StarsProps) => {
  const t = useT()

  return (
    <span className={styles.stars} role='img' aria-label={t('{rating} of 5', { rating })}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star key={value} weight={value <= Math.round(rating) ? 'fill' : 'regular'} aria-hidden />
      ))}
    </span>
  )
}
