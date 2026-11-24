'use client'

import { CircleHalf, Moon, Sun } from '@phosphor-icons/react/ssr'
import { useT } from '@/shared/i18n'
import { useTheme } from '@/shared/lib/hooks/useTheme'
import type { Theme } from '@/shared/lib/theme'
import styles from './ThemeToggle.module.css'

const LABELS: Record<Theme, string> = {
  system: 'as the system',
  light: 'light',
  dark: 'dark',
}

const ICONS = { system: CircleHalf, light: Sun, dark: Moon }

export const ThemeToggle = () => {
  const t = useT()
  const { theme, cycleTheme } = useTheme()
  const Icon = ICONS[theme]

  return (
    <button
      type='button'
      className={styles.toggle}
      onClick={cycleTheme}
      aria-label={t('Theme: {theme}. Change', { theme: t(LABELS[theme]) })}
      title={t('Theme: {theme}', { theme: t(LABELS[theme]) })}
    >
      <Icon weight={theme === 'system' ? 'regular' : 'fill'} aria-hidden />
    </button>
  )
}
