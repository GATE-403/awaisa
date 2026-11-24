import type { MetadataRoute } from 'next'
import { LOCALES, localizePath } from '@/shared/i18n/locales'
import { absoluteUrl } from '@/shared/lib/seo/siteUrl'

const APP_ONLY_PAGES = [
  '/manage',
  '/master',
  '/bookings',
  '/login',
  '/ui',
  '/insights',
  '/moderation',
]

const robots = (): MetadataRoute.Robots => ({
  rules: {
    userAgent: '*',
    allow: '/',
    // Anchored with `$`, `/` and `?` so a slug like /ui-studio stays crawlable.
    // Every language's copy of them too (`/ru/manage`); `/api/` exists once.
    disallow: [
      ...LOCALES.flatMap((locale) =>
        [
          ...APP_ONLY_PAGES.flatMap((page) => [`${page}$`, `${page}/`, `${page}?`]),
          '/pay/',
          '/receipt/',
          '/review/',
          '/v/',
        ].map((rule) => localizePath(rule, locale)),
      ),
      '/api/',
      '/*/book',
    ],
  },
  sitemap: absoluteUrl('/sitemap.xml'),
})

// biome-ignore lint/style/noDefaultExport: Next reads metadata routes from the default export
export default robots
