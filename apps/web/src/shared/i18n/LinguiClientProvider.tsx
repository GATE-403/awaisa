'use client'

import { type Messages, setupI18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import dynamic from 'next/dynamic'
import { type ReactNode, useState } from 'react'
import type { Locale } from './locales'

interface CatalogProviderProps {
  locale: Locale
  messages: Messages
  children: ReactNode
}

interface LinguiClientProviderProps {
  locale: Locale
  children: ReactNode
}

// Changing the language is a navigation to its address, which renders this provider anew, so the
// instance never changes under a mounted tree.
const CatalogProvider = ({ locale, messages, children }: CatalogProviderProps) => {
  const [i18n] = useState(() => setupI18n({ locale, messages: { [locale]: messages } }))
  return <I18nProvider i18n={i18n}>{children}</I18nProvider>
}

// Each language's messages are a chunk of their own (a hashed, immutable file the browser keeps),
// never a prop: a prop went into every page's HTML and RSC payload (~100 KB of the ~400 KB of a
// place page). `next/dynamic` renders the chosen one on the server and preloads its chunk in the
// HTML, so hydration waits for that file and renders the same text as the server. The `import()`
// calls stay literal so the bundler splits them and Next knows which chunk to preload.
const PROVIDERS = {
  en: dynamic(() =>
    import('@/locales/en/messages').then(({ messages }) => ({
      default: ({ children }: { children: ReactNode }) => (
        <CatalogProvider locale='en' messages={messages}>
          {children}
        </CatalogProvider>
      ),
    })),
  ),
  ru: dynamic(() =>
    import('@/locales/ru/messages').then(({ messages }) => ({
      default: ({ children }: { children: ReactNode }) => (
        <CatalogProvider locale='ru' messages={messages}>
          {children}
        </CatalogProvider>
      ),
    })),
  ),
  ky: dynamic(() =>
    import('@/locales/ky/messages').then(({ messages }) => ({
      default: ({ children }: { children: ReactNode }) => (
        <CatalogProvider locale='ky' messages={messages}>
          {children}
        </CatalogProvider>
      ),
    })),
  ),
} satisfies Record<Locale, unknown>

/** The page's language for client components; only that language's messages reach the browser. */
export const LinguiClientProvider = ({ locale, children }: LinguiClientProviderProps) => {
  const Provider = PROVIDERS[locale]
  return <Provider>{children}</Provider>
}
