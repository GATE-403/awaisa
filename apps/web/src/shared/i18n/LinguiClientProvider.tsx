'use client'

import { type Messages, setupI18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { type ReactNode, useState } from 'react'

interface LinguiClientProviderProps {
  locale: string
  messages: Messages
  children: ReactNode
}

// The browser gets the page's language and its messages from the server (an I18n instance cannot
// cross that line itself). Changing the language is a navigation to its address, which renders
// this provider anew, so the instance never changes under a mounted tree.
export const LinguiClientProvider = ({ locale, messages, children }: LinguiClientProviderProps) => {
  const [i18n] = useState(() => setupI18n({ locale, messages: { [locale]: messages } }))
  return <I18nProvider i18n={i18n}>{children}</I18nProvider>
}
