'use client'

import { Star } from '@phosphor-icons/react/ssr'
import { useId } from 'react'
import styles from './StarRating.module.css'

interface StarRatingProps {
  value: number
  onChange: (value: number) => void
}

const LABELS = ['Плохо', 'Так себе', 'Нормально', 'Хорошо', 'Отлично']

// Five big stars over native radios: arrows move the rating, the word under them says what it means.
export const StarRating = ({ value, onChange }: StarRatingProps) => {
  const name = useId()

  return (
    <fieldset className={styles.rating}>
      <legend className={styles.legend}>Оценка</legend>
      <span className={styles.stars}>
        {LABELS.map((label, index) => {
          const stars = index + 1
          return (
            <label key={label} className={styles.star} data-on={stars <= value || undefined}>
              <input
                type='radio'
                name={name}
                value={stars}
                checked={value === stars}
                onChange={() => onChange(stars)}
                className={styles.input}
                aria-label={`${stars} из 5 — ${label}`}
              />
              <Star weight={stars <= value ? 'fill' : 'regular'} aria-hidden />
            </label>
          )
        })}
      </span>
      <span className={styles.caption} aria-live='polite'>
        {value > 0 ? LABELS[value - 1] : 'Коснитесь звезды'}
      </span>
    </fieldset>
  )
}
