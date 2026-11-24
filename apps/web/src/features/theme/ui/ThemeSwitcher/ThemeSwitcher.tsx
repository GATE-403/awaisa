'use client'

import type { MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { useTheme } from '@/shared/lib/hooks/useTheme'
import type { Theme } from '@/shared/lib/theme'
import styles from './ThemeSwitcher.module.css'

const OPTIONS: { value: Theme; label: MessageDescriptor }[] = [
  { value: 'system', label: msg`Auto` },
  { value: 'light', label: msg({ message: 'Light', context: 'theme, feminine' }) },
  { value: 'dark', label: msg({ message: 'Dark', context: 'theme, feminine' }) },
]

export const ThemeSwitcher = () => {
  const { t } = useLingui()
  const { theme, setTheme } = useTheme()

  return (
    <fieldset aria-label={t`Theme`} className={styles.switcher}>
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
