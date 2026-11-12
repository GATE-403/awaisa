import type { MetadataRoute } from 'next'
import { listBusinesses } from '@/shared/api/serverApi'
import type { BusinessCard } from '@/shared/api/types'
import { absoluteUrl } from '@/shared/lib/seo/siteUrl'

const STATIC_PAGES: MetadataRoute.Sitemap = [
  { url: absoluteUrl('/'), changeFrequency: 'daily', priority: 1 },
  { url: absoluteUrl('/map'), changeFrequency: 'daily', priority: 0.7 },
  { url: absoluteUrl('/business'), changeFrequency: 'monthly', priority: 0.5 },
]

// An API outage must not fail the build or blank the sitemap's static part.
const loadBusinesses = async (): Promise<BusinessCard[]> => {
  try {
    return await listBusinesses(undefined, undefined)
  } catch {
    return []
  }
}

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const businesses = await loadBusinesses()

  return [
    ...STATIC_PAGES,
    ...businesses.flatMap((business) => [
      { url: absoluteUrl(`/${business.slug}`), changeFrequency: 'weekly' as const, priority: 0.9 },
      {
        url: absoluteUrl(`/${business.slug}/services`),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      },
    ]),
  ]
}

// biome-ignore lint/style/noDefaultExport: Next reads metadata routes from the default export
export default sitemap
