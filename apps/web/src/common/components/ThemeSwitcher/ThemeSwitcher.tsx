'use client'

import { useTheme } from '@/common/hooks/useTheme'
import type { Theme } from '@/common/utils/theme'
import styles from './ThemeSwitcher.module.css'

const OPTIONS: { value: Theme; label: string }[] = [
  { value: 'system', label: 'Авто' },
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
]

export const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme()

  return (
    <fieldset aria-label='Тема оформления' className={styles.switcher}>
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type='button'
          aria-pressed={theme === value}
          className={styles.option}
          onClick={() => setTheme(value)}
        >
          {label}
        </button>
      ))}
    </fieldset>
  )
}
