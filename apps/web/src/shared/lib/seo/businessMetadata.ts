import type { I18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type { Metadata } from 'next'
import type { Business } from '@/shared/api/types'
import { getKindLabel, PLATFORM } from '@/shared/config/platform'
import { ogLocale, say } from './seoText'
import { absoluteUrl } from './siteUrl'

const DESCRIPTION_LIMIT = 160

const OG_IMAGE_SIZE = { width: 1200, height: 630 }

/** What every page's Open Graph shares, in the page's language. */
const baseOpenGraph = (i18n: I18n) =>
  ({
    type: 'website',
    siteName: PLATFORM.name,
    locale: ogLocale(i18n),
  }) as const

// The site's generated share image (`app/opengraph-image.tsx`), for pages that set their own
// openGraph: it replaces the layout's whole, the image included.
const PLATFORM_OG_IMAGE = {
  url: absoluteUrl('/opengraph-image'),
  alt: PLATFORM.name,
  ...OG_IMAGE_SIZE,
}

const truncate = (text: string, limit: number) => {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= limit) return clean

  return `${clean.slice(0, limit - 1).trimEnd()}…`
}

const describeBusiness = (business: Business, i18n: I18n) => {
  const kind = say(i18n, getKindLabel(business.kind))
  const address = business.address

  return truncate(
    business.description ||
      i18n._(msg`${kind} · ${address}. Prices, specialists and online booking, no calls.`),
    DESCRIPTION_LIMIT,
  )
}

interface BusinessMetadataOptions {
  business: Business
  i18n: I18n
  path: string
  title: string
  description?: string
  // Pages without their own opengraph-image file point at the business one explicitly, because a
  // page's openGraph replaces whatever its layout segment generated.
  fallbackImage?: string
}

const buildBusinessMetadata = ({
  business,
  i18n,
  path,
  title,
  description = describeBusiness(business, i18n),
  fallbackImage,
}: BusinessMetadataOptions): Metadata => {
  const image = business.coverUrl
    ? { url: absoluteUrl(business.coverUrl), alt: business.name }
    : fallbackImage
      ? { url: fallbackImage, alt: business.name, ...OG_IMAGE_SIZE }
      : null

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    ...(!business.isPublished && { robots: { index: false, follow: false } }),
    openGraph: {
      ...baseOpenGraph(i18n),
      url: path,
      title,
      description,
      // Without the key the segment's generated opengraph-image fills it in.
      ...(image && { images: [image] }),
    },
  }
}

export { baseOpenGraph, buildBusinessMetadata, describeBusiness, OG_IMAGE_SIZE, PLATFORM_OG_IMAGE }
