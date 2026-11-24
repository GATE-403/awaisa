import { INTL_LOCALES, LOCALES, localizePath } from '@/shared/i18n/locales'
import { absoluteUrl } from './siteUrl'

/**
 * Every language's address of one page, for hreflang (the sitemap's `alternates.languages`):
 * `/map` → { 'en-GB': …/map, 'ru-RU': …/ru/map, 'ky-KG': …/ky/map, 'x-default': …/map }.
 */
const languageAlternates = (path: string): Record<string, string> => ({
  ...Object.fromEntries(
    LOCALES.map((locale) => [INTL_LOCALES[locale], absoluteUrl(localizePath(path, locale))]),
  ),
  'x-default': absoluteUrl(path),
})

export { languageAlternates }
