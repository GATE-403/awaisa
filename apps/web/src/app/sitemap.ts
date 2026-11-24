import type { MetadataRoute } from 'next'
import { listAllBusinesses, listLeaderboard, listPlacesLeaderboard } from '@/shared/api/serverApi'
import type { BusinessCard } from '@/shared/api/types'
import { languageAlternates } from '@/shared/lib/seo/languageAlternates'
import { absoluteUrl } from '@/shared/lib/seo/siteUrl'
import { INDEXED_KINDS, kindHref } from '@/views/catalog'
import { BOARDS, boardHref } from '@/views/leaderboard'

const STATIC_PAGES: MetadataRoute.Sitemap = [
  { url: absoluteUrl('/'), changeFrequency: 'daily', priority: 1 },
  { url: absoluteUrl('/map'), changeFrequency: 'daily', priority: 0.7 },
  { url: absoluteUrl('/feed'), changeFrequency: 'daily', priority: 0.7 },
  { url: absoluteUrl('/business'), changeFrequency: 'monthly', priority: 0.5 },
  { url: absoluteUrl('/updates'), changeFrequency: 'weekly', priority: 0.3 },
]

// Each kind is a landing of its own: "barbershop Bishkek" is what people search for.
const KIND_PAGES: MetadataRoute.Sitemap = INDEXED_KINDS.map((kind) => ({
  url: absoluteUrl(kindHref(kind)),
  changeFrequency: 'daily',
  priority: 0.9,
}))

// An API outage must not fail the build or blank the sitemap's static part.
const loadBusinesses = async (): Promise<BusinessCard[]> => {
  try {
    return await listAllBusinesses()
  } catch {
    return []
  }
}

// Only boards with someone on them: an empty board is a thin page.
const loadBoards = async (): Promise<MetadataRoute.Sitemap> => {
  const boards = await Promise.all(
    BOARDS.flatMap(({ kind }) => [
      listLeaderboard(kind)
        .then((entries) => (entries.length > 0 ? boardHref('masters', kind) : null))
        .catch(() => null),
      listPlacesLeaderboard(kind)
        .then((entries) => (entries.length > 0 ? boardHref('places', kind) : null))
        .catch(() => null),
    ]),
  )

  return boards
    .filter((href) => href !== null)
    .map((href) => ({ url: absoluteUrl(href), changeFrequency: 'weekly', priority: 0.6 }))
}

// Each page is listed at its English address with its Russian and Kyrgyz twins as hreflang
// alternates, so search engines show the language people search in.
const withLanguages = (entry: MetadataRoute.Sitemap[number]): MetadataRoute.Sitemap[number] => {
  const path = new URL(entry.url).pathname + new URL(entry.url).search
  return { ...entry, alternates: { languages: languageAlternates(path) } }
}

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const [businesses, boards] = await Promise.all([loadBusinesses(), loadBoards()])

  const entries: MetadataRoute.Sitemap = [
    ...STATIC_PAGES,
    ...KIND_PAGES,
    ...boards,
    ...businesses.flatMap((business) => [
      { url: absoluteUrl(`/${business.slug}`), changeFrequency: 'weekly' as const, priority: 0.9 },
      {
        url: absoluteUrl(`/${business.slug}/services`),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      },
    ]),
  ]
  return entries.map(withLanguages)
}

// biome-ignore lint/style/noDefaultExport: Next reads metadata routes from the default export
export default sitemap
