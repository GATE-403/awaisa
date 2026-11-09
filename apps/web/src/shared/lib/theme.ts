type Theme = 'system' | 'light' | 'dark'

const THEME_KEY = 'awaisa:theme'
const THEME_EVENT = 'awaisa:theme-change'
const THEMES: Theme[] = ['system', 'light', 'dark']

const isTheme = (value: unknown): value is Theme => THEMES.includes(value as Theme)

const readTheme = (): Theme => {
  try {
    const stored = window.localStorage.getItem(THEME_KEY)
    return isTheme(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

const applyTheme = (theme: Theme) => {
  if (theme === 'system') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = theme
}

const saveTheme = (theme: Theme) => {
  try {
    if (theme === 'system') window.localStorage.removeItem(THEME_KEY)
    else window.localStorage.setItem(THEME_KEY, theme)
  } catch {
    // Private mode: the choice still applies for this page view.
  }
  applyTheme(theme)
  window.dispatchEvent(new Event(THEME_EVENT))
}

const subscribeToTheme = (onChange: () => void) => {
  window.addEventListener(THEME_EVENT, onChange)
  window.addEventListener('storage', onChange)

  return () => {
    window.removeEventListener(THEME_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

// Runs in <head> before the first paint, so a stored dark theme never flashes light.
const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`

export type { Theme }
export { readTheme, saveTheme, subscribeToTheme, THEME_BOOT_SCRIPT, THEMES }
