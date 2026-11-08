import { useSyncExternalStore } from 'react'
import { readTheme, saveTheme, subscribeToTheme, THEMES, type Theme } from '@/common/utils/theme'

const getServerTheme = (): Theme => 'system'

export const useTheme = () => {
  const theme = useSyncExternalStore(subscribeToTheme, readTheme, getServerTheme)

  const cycleTheme = () => {
    const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length] ?? 'system'
    saveTheme(next)
  }

  return { theme, cycleTheme }
}
