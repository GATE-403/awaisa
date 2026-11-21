'use client'

import { useT } from '@/shared/i18n'
import { useTheme } from '@/shared/lib/hooks/useTheme'
import type { Theme } from '@/shared/lib/theme'
import styles from './ThemeSwitcher.module.css'

const OPTIONS: { value: Theme; label: string }[] = [
  { value: 'system', label: 'Авто' },
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
]

export const ThemeSwitcher = () => {
  const t = useT()
  const { theme, setTheme } = useTheme()

  return (
    <fieldset aria-label={t('Тема оформления')} className={styles.switcher}>
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type='button'
          aria-pressed={theme === value}
          className={styles.option}
          onClick={() => setTheme(value)}
        >
          {t(label)}
        </button>
      ))}
    </fieldset>
  )
}
