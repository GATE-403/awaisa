'use client'

import { Check } from '@phosphor-icons/react/ssr'
import { useId } from 'react'
import { useTheme } from '@/shared/lib/hooks/useTheme'
import type { Theme } from '@/shared/lib/theme'
import styles from './AppearancePicker.module.css'

const OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
  { value: 'system', label: 'Авто' },
]

// iOS Settings › Display: a little picture of each look with a check under the chosen one.
// Native radios underneath give arrow keys and focus.
export const AppearancePicker = () => {
  const { theme, setTheme } = useTheme()
  const name = useId()

  return (
    <fieldset className={styles.picker}>
      <legend className={styles.legend}>Тема оформления</legend>
      {OPTIONS.map(({ value, label }) => (
        <label key={value} className={styles.option}>
          <input
            type='radio'
            name={name}
            value={value}
            checked={theme === value}
            onChange={() => setTheme(value)}
            className={styles.input}
          />
          <span className={styles.preview} data-look={value} aria-hidden='true'>
            <span className={styles.window}>
              <span className={styles.line} />
              <span className={styles.line} data-short='' />
              <span className={styles.pill} />
            </span>
          </span>
          <span className={styles.label}>{label}</span>
          <span className={styles.check} aria-hidden='true'>
            <Check weight='bold' />
          </span>
        </label>
      ))}
    </fieldset>
  )
}
