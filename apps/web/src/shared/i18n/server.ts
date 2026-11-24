import 'server-only'

import { setI18n } from '@lingui/react/server'
import {
  permanentRedirect as nextPermanentRedirect,
  redirect as nextRedirect,
} from 'next/navigation'
import { lang } from 'next/root-params'
import { getI18nInstance } from './instances'
import { DEFAULT_LOCALE, isLocale, type Locale, localizePath } from './locales'

/** The page's language, from the `[lang]` segment. */
const getLocale = async (): Promise<Locale> => {
  const value = await lang()
  return isLocale(value) ? value : DEFAULT_LOCALE
}

/**
 * Makes this request's language the one server `Trans` and `useLingui` read. Every layout, page
 * and `generateMetadata` calls it: nested pages render before their layouts, so none can rely on
 * a parent having done it.
 */
const initLingui = async () => {
  const i18n = getI18nInstance(await getLocale())
  setI18n(i18n)
  return i18n
}

/** `redirect()` to a bare path of this site, in the page's language. */
const redirect = async (path: string): Promise<never> =>
  nextRedirect(localizePath(path, await getLocale()))

const permanentRedirect = async (path: string): Promise<never> =>
  nextPermanentRedirect(localizePath(path, await getLocale()))

export { getLocale, initLingui, permanentRedirect, redirect }
