'use client'

import { CircleHalf, Moon, Sun } from '@phosphor-icons/react/ssr'
import { useT } from '@/shared/i18n'
import { useTheme } from '@/shared/lib/hooks/useTheme'
import type { Theme } from '@/shared/lib/theme'
import styles from './ThemeToggle.module.css'

const LABELS: Record<Theme, string> = {
  system: 'как в системе',
  light: 'светлая',
  dark: 'тёмная',
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
      aria-label={t('Тема: {theme}. Сменить', { theme: t(LABELS[theme]) })}
      title={t('Тема: {theme}', { theme: t(LABELS[theme]) })}
    >
      <Icon weight={theme === 'system' ? 'regular' : 'fill'} aria-hidden />
    </button>
  )
}
