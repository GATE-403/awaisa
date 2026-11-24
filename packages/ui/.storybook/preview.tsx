import '@awaisa/tokens/tokens.css'
import '../src/styles/base.css'
import type { Decorator, Preview } from '@storybook/react-vite'
import { useEffect } from 'react'

type Theme = 'system' | 'light' | 'dark'

// The app forces a theme with `<html data-theme>` and follows the system without it, so the
// toolbar does the same.
const withTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme as Theme

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
  }, [theme])

  return <Story />
}

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: 'Theme',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'system', title: 'System' },
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'system' },
  parameters: {
    layout: 'padded',
    controls: { expanded: true },
    // The page's own colour comes from the tokens (`body` in base.css).
    backgrounds: { disable: true },
  },
}

export default preview
