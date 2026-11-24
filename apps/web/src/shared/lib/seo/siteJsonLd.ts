import type { I18n } from '@lingui/core'
import { PLATFORM } from '@/shared/config/platform'
import { localeOf, SITE_TAGLINE } from './seoText'
import { absoluteUrl, SITE_URL } from './siteUrl'

/**
 * schema.org `WebSite` + `Organization`: the site's name and logo in search results, described in
 * the page's language when `i18n` is given (English without it).
 */
const siteJsonLd = (i18n?: I18n) => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: absoluteUrl('/'),
      name: PLATFORM.name,
      description: i18n ? i18n._(SITE_TAGLINE) : PLATFORM.tagline,
      inLanguage: i18n ? localeOf(i18n) : 'en',
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: PLATFORM.name,
      url: absoluteUrl('/'),
      // The home-screen icon: a raster image ≥ 112px, as Google asks of a logo.
      logo: absoluteUrl('/apple-icon'),
    },
  ],
})

/** schema.org `ItemList` of places, in the order the page shows them. */
const placesJsonLd = (name: string, places: { slug: string; name: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name,
  numberOfItems: places.length,
  itemListElement: places.map((place, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    url: absoluteUrl(`/${place.slug}`),
    name: place.name,
  })),
})

export { placesJsonLd, siteJsonLd }
