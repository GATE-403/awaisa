'use client'

import { Star } from '@phosphor-icons/react/ssr'
import { useId } from 'react'
import { useT } from '@/shared/i18n'
import styles from './StarRating.module.css'

interface StarRatingProps {
  value: number
  onChange: (value: number) => void
}

const LABELS = ['Плохо', 'Так себе', 'Нормально', 'Хорошо', 'Отлично']

// Five big stars over native radios: arrows move the rating, the word under them says what it means.
export const StarRating = ({ value, onChange }: StarRatingProps) => {
  const t = useT()
  const name = useId()

  return (
    <fieldset className={styles.rating}>
      <legend className={styles.legend}>{t('Оценка')}</legend>
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
                aria-label={t('{stars} из 5 - {label}', { stars, label: t(label) })}
              />
              <Star weight={stars <= value ? 'fill' : 'regular'} aria-hidden />
            </label>
          )
        })}
      </span>
      <span className={styles.caption} aria-live='polite'>
        {value > 0 ? t(LABELS[value - 1] ?? '') : t('Коснитесь звезды')}
      </span>
    </fieldset>
  )
}
