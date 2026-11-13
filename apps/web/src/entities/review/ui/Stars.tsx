import { Star } from '@phosphor-icons/react/ssr'
import styles from './ReviewItem.module.css'

interface StarsProps {
  rating: number
}

// Five small stars, the given number filled; read as «4 из 5».
export const Stars = ({ rating }: StarsProps) => (
  <span className={styles.stars} role='img' aria-label={`${rating} из 5`}>
    {[1, 2, 3, 4, 5].map((value) => (
      <Star key={value} weight={value <= Math.round(rating) ? 'fill' : 'regular'} aria-hidden />
    ))}
  </span>
)
