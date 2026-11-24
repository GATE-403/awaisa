'use client'

import { msg, ph } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { Star } from '@phosphor-icons/react/ssr'
import { useId } from 'react'
import styles from './StarRating.module.css'

interface StarRatingProps {
  value: number
  onChange: (value: number) => void
}

const LABELS = [msg`Bad`, msg`So-so`, msg`OK`, msg`Good`, msg`Excellent`]

// Five big stars over native radios: arrows move the rating, the word under them says what it means.
export const StarRating = ({ value, onChange }: StarRatingProps) => {
  const { t } = useLingui()
  const name = useId()
  const chosen = LABELS[value - 1]

  return (
    <fieldset className={styles.rating}>
      <legend className={styles.legend}>{t`Rating`}</legend>
      <span className={styles.stars}>
        {LABELS.map((label, index) => {
          const stars = index + 1
          return (
            <label key={stars} className={styles.star} data-on={stars <= value || undefined}>
              <input
                type='radio'
                name={name}
                value={stars}
                checked={value === stars}
                onChange={() => onChange(stars)}
                className={styles.input}
                aria-label={t`${stars} of 5: ${ph({ label: t(label) })}`}
              />
              <Star weight={stars <= value ? 'fill' : 'regular'} aria-hidden />
            </label>
          )
        })}
      </span>
      <span className={styles.caption} aria-live='polite'>
        {chosen ? t(chosen) : t`Tap a star`}
      </span>
    </fieldset>
  )
}
