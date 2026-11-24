'use client'

import type { MessageDescriptor } from '@lingui/core'
import { msg, ph } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { CircleHalf, Moon, Sun } from '@phosphor-icons/react/ssr'
import { useTheme } from '@/shared/lib/hooks/useTheme'
import type { Theme } from '@/shared/lib/theme'
import styles from './ThemeToggle.module.css'

const LABELS: Record<Theme, MessageDescriptor> = {
  system: msg`as the system`,
  light: msg`light`,
  dark: msg`dark`,
}

const ICONS = { system: CircleHalf, light: Sun, dark: Moon }

export const ThemeToggle = () => {
  const { t } = useLingui()
  const { theme, cycleTheme } = useTheme()
  const Icon = ICONS[theme]

  return (
    <button
      type='button'
      className={styles.toggle}
      onClick={cycleTheme}
      aria-label={t`Theme: ${ph({ theme: t(LABELS[theme]) })}. Change`}
      title={t`Theme: ${ph({ theme: t(LABELS[theme]) })}`}
    >
      <Icon weight={theme === 'system' ? 'regular' : 'fill'} aria-hidden />
    </button>
  )
}
