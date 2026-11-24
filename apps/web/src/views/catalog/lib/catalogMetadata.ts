import type { I18n } from '@lingui/core'
import { msg, ph } from '@lingui/core/macro'
import type { Metadata } from 'next'
import type { BusinessKind } from '@/shared/api/types'
import { BUSINESS_KINDS, PLATFORM } from '@/shared/config/platform'
import { baseOpenGraph, PLATFORM_OG_IMAGE } from '@/shared/lib/seo/businessMetadata'
import { SITE_TAGLINE } from '@/shared/lib/seo/seoText'
import { KIND_SEO } from '../config/kindSeo'

type CatalogParams = Record<string, string | string[] | undefined>

const HOME_TITLE = msg`${ph({ platform: PLATFORM.name })}: online booking with Bishkek salons and specialists`

const kindHref = (kind: BusinessKind) => `/?kind=${kind}`

/**
 * The catalog is one route, so each kind is its own landing by `?kind=`: its own title and
 * canonical. Searches and sorting are views of those pages, not pages: never indexed, and a
 * sort points back to the page it sorts.
 */
const catalogMetadata = (params: CatalogParams, i18n: I18n): Metadata => {
  const kind = BUSINESS_KINDS.find((item) => item.value === params.kind)?.value
  const seo = kind ? KIND_SEO[kind] : undefined
  const isSearch = typeof params.q === 'string' && params.q.trim() !== ''
  const path = seo && kind ? kindHref(kind) : '/'
  const title = i18n._(seo?.title ?? HOME_TITLE)
  const description = i18n._(seo?.description ?? SITE_TAGLINE)
  const isIndexed = !isSearch && (!kind || Boolean(seo))

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    ...(!isIndexed && { robots: { index: false, follow: true } }),
    openGraph: {
      ...baseOpenGraph(i18n),
      url: path,
      title,
      description,
      images: [PLATFORM_OG_IMAGE],
    },
  }
}

export { catalogMetadata, kindHref }
