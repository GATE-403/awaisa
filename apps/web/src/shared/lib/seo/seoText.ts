import type { I18n, MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { DEFAULT_LOCALE, INTL_LOCALES, isLocale, type Locale } from '@/shared/i18n/locales'

/** The site's one-line pitch, the same words as `PLATFORM.tagline`. */
const SITE_TAGLINE = msg`Online booking with salons and specialists: no calls.`

/** A label kept as a plain string or as a descriptor, in the page's language. */
const say = (i18n: I18n, value: string | MessageDescriptor) =>
  typeof value === 'string' ? value : i18n._(value)

const localeOf = (i18n: I18n): Locale => (isLocale(i18n.locale) ? i18n.locale : DEFAULT_LOCALE)

/** «en_GB», «ru_RU», «ky_KG»: Open Graph writes the region after an underscore. */
const ogLocale = (i18n: I18n) => INTL_LOCALES[localeOf(i18n)].replace('-', '_')

export { localeOf, ogLocale, SITE_TAGLINE, say }
