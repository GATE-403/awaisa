'use client'

import { CircleHalf, Moon, Sun } from '@phosphor-icons/react/ssr'
import { useTheme } from '@/common/hooks/useTheme'
import type { Theme } from '@/common/utils/theme'
import styles from './ThemeToggle.module.css'

const LABELS: Record<Theme, string> = {
  system: 'как в системе',
  light: 'светлая',
  dark: 'тёмная',
}

const ICONS = { system: CircleHalf, light: Sun, dark: Moon }

export const ThemeToggle = () => {
  const { theme, cycleTheme } = useTheme()
  const Icon = ICONS[theme]

  return (
    <button
      type='button'
      className={styles.toggle}
      onClick={cycleTheme}
      aria-label={`Тема: ${LABELS[theme]}. Сменить`}
      title={`Тема: ${LABELS[theme]}`}
    >
      <Icon weight={theme === 'system' ? 'regular' : 'fill'} aria-hidden />
    </button>
  )
}
