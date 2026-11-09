'use client'

import { useSyncExternalStore } from 'react'
import { readTheme, saveTheme, subscribeToTheme, THEMES, type Theme } from '@/shared/lib/theme'

const getServerTheme = (): Theme => 'system'

export const useTheme = () => {
  const theme = useSyncExternalStore(subscribeToTheme, readTheme, getServerTheme)

  const cycleTheme = () => {
    const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length] ?? 'system'
    saveTheme(next)
  }

  return { theme, cycleTheme, setTheme: saveTheme }
}
