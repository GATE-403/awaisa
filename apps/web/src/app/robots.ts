import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@/shared/lib/seo/siteUrl'

const APP_ONLY_PAGES = ['/manage', '/master', '/bookings', '/login', '/ui']

const robots = (): MetadataRoute.Robots => ({
  rules: {
    userAgent: '*',
    allow: '/',
    // Anchored with `$`, `/` and `?` so a slug like /ui-studio stays crawlable.
    disallow: [
      ...APP_ONLY_PAGES.flatMap((page) => [`${page}$`, `${page}/`, `${page}?`]),
      '/pay/',
      '/review/',
      '/v/',
      '/api/',
      '/*/book',
    ],
  },
  sitemap: absoluteUrl('/sitemap.xml'),
})

// biome-ignore lint/style/noDefaultExport: Next reads metadata routes from the default export
export default robots
