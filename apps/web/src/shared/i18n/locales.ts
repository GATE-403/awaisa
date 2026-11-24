// The languages of the interface. English is the source and lives at the bare address (`/map`);
// the others under their prefix (`/ru/map`, `/ky/map`). Routes are `app/[lang]/…`, and the proxy
// rewrites a bare address to `/en/…` inside, so the code itself always thinks in bare paths.

const LOCALES = ['en', 'ru', 'ky'] as const
type Locale = (typeof LOCALES)[number]

const DEFAULT_LOCALE: Locale = 'en'

/** Their own names, for the switcher. */
const LOCALE_NAMES: Record<Locale, string> = { en: 'English', ru: 'Русский', ky: 'Кыргызча' }

/** For `Intl` formats and `<html lang>`. */
const INTL_LOCALES: Record<Locale, string> = { en: 'en-GB', ru: 'ru-RU', ky: 'ky-KG' }

const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (LOCALES as readonly string[]).includes(value)

/** `/ru/map?kind=x` → `{ locale: 'ru', path: '/map?kind=x' }`; a bare path is English. */
const splitLocale = (path: string): { locale: Locale; path: string } => {
  const match = /^\/([a-z]{2})(?=\/|\?|#|$)/.exec(path)
  const prefix = match?.[1]
  if (!isLocale(prefix) || prefix === DEFAULT_LOCALE) return { locale: DEFAULT_LOCALE, path }
  return { locale: prefix, path: path.slice(prefix.length + 1) || '/' }
}

/**
 * A path of this site in a language: `/map` → `/ru/map`, `/` → `/ru`. Anything else (another
 * origin, `#anchor`, `mailto:`, an `/api/` call, a path already carrying a language) is left as it is.
 */
const localizePath = (path: string, locale: Locale) => {
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/api/')) return path
  const bare = splitLocale(path).path
  if (locale === DEFAULT_LOCALE) return bare
  if (bare === '/') return `/${locale}`
  if (bare.startsWith('/?') || bare.startsWith('/#')) return `/${locale}${bare.slice(1)}`
  return `/${locale}${bare}`
}

/** The language a person picked in the switcher; it wins over the browser's languages. */
const LOCALE_COOKIE = 'awaisa_lang'

/**
 * The interface language for someone who has not picked one, from the browser's own list
 * (`Accept-Language: ky-KG, ru;q=0.9, en;q=0.8`): the first of ours they read, by their order of
 * preference; English when they read none of them or send nothing (crawlers).
 */
const pickLocale = (acceptLanguage: string | null): Locale => {
  if (!acceptLanguage) return DEFAULT_LOCALE
  const ranked = acceptLanguage
    .split(',')
    .map((part, index) => {
      const [tag = '', ...params] = part.trim().split(';')
      const quality = params.map((param) => param.trim()).find((param) => param.startsWith('q='))
      return {
        language: tag.split('-')[0]?.toLowerCase(),
        q: quality ? Number(quality.slice(2)) : 1,
        index,
      }
    })
    .filter((entry) => entry.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index)
  return ranked.map((entry) => entry.language).find(isLocale) ?? DEFAULT_LOCALE
}

export type { Locale }
export {
  DEFAULT_LOCALE,
  INTL_LOCALES,
  isLocale,
  LOCALE_COOKIE,
  LOCALE_NAMES,
  LOCALES,
  localizePath,
  pickLocale,
  splitLocale,
}
