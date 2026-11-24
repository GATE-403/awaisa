import { type I18n, type Messages, setupI18n } from '@lingui/core'
import { messages as en } from '@/locales/en/messages'
import { messages as ky } from '@/locales/ky/messages'
import { messages as ru } from '@/locales/ru/messages'
import { DEFAULT_LOCALE, isLocale, type Locale } from './locales'

// Compiled catalogs (`pnpm --filter web i18n:compile`). The server holds all three; a page sends
// the browser only its own language's messages (`LinguiClientProvider`).
const CATALOGS: Record<Locale, Messages> = { en, ru, ky }

// One instance per language for the server process: requests in different languages never
// share one, so there is nothing to race over.
const instances = new Map<Locale, I18n>()

const getI18nInstance = (value: string): I18n => {
  const locale = isLocale(value) ? value : DEFAULT_LOCALE
  const existing = instances.get(locale)
  if (existing) return existing
  const i18n = setupI18n({ locale, messages: { [locale]: CATALOGS[locale] } })
  instances.set(locale, i18n)
  return i18n
}

export { CATALOGS, getI18nInstance }
