import { PLATFORM } from '@/shared/config/platform'
import { absoluteUrl, SITE_URL } from './siteUrl'

/** schema.org `WebSite` + `Organization`: the site's name and logo in search results. */
const siteJsonLd = () => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: absoluteUrl('/'),
      name: PLATFORM.name,
      description: PLATFORM.tagline,
      inLanguage: 'ru',
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
