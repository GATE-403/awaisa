import type { Metadata } from 'next'
import type { BusinessKind } from '@/shared/api/types'
import { BUSINESS_KINDS, PLATFORM } from '@/shared/config/platform'
import { BASE_OPEN_GRAPH, PLATFORM_OG_IMAGE } from '@/shared/lib/seo/businessMetadata'
import { KIND_SEO } from '../config/kindSeo'

type CatalogParams = Record<string, string | string[] | undefined>

const HOME_TITLE = `${PLATFORM.name}: онлайн-запись в салоны и к мастерам Бишкека`

const kindHref = (kind: BusinessKind) => `/?kind=${kind}`

/**
 * The catalog is one route, so each kind is its own landing by `?kind=`: its own title and
 * canonical. Searches and sorting are views of those pages, not pages: never indexed, and a
 * sort points back to the page it sorts.
 */
const catalogMetadata = (params: CatalogParams): Metadata => {
  const kind = BUSINESS_KINDS.find((item) => item.value === params.kind)?.value
  const seo = kind ? KIND_SEO[kind] : undefined
  const isSearch = typeof params.q === 'string' && params.q.trim() !== ''
  const path = seo && kind ? kindHref(kind) : '/'
  const title = seo?.title ?? HOME_TITLE
  const description = seo?.description ?? PLATFORM.tagline
  const isIndexed = !isSearch && (!kind || Boolean(seo))

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    ...(!isIndexed && { robots: { index: false, follow: true } }),
    openGraph: {
      ...BASE_OPEN_GRAPH,
      url: path,
      title,
      description,
      images: [PLATFORM_OG_IMAGE],
    },
  }
}

export { catalogMetadata, kindHref }
