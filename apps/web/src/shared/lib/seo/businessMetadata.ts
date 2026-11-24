import type { Metadata } from 'next'
import type { Business } from '@/shared/api/types'
import { getKindLabel, PLATFORM } from '@/shared/config/platform'
import { absoluteUrl } from './siteUrl'

const DESCRIPTION_LIMIT = 160

const OG_IMAGE_SIZE = { width: 1200, height: 630 }

const BASE_OPEN_GRAPH = {
  type: 'website',
  siteName: PLATFORM.name,
  locale: 'en_GB',
} as const

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

const describeBusiness = (business: Business) =>
  truncate(
    business.description ||
      `${getKindLabel(business.kind)} · ${business.address}. Prices, specialists and online booking, no calls.`,
    DESCRIPTION_LIMIT,
  )

interface BusinessMetadataOptions {
  business: Business
  path: string
  title: string
  description?: string
  // Pages without their own opengraph-image file point at the business one explicitly, because a
  // page's openGraph replaces whatever its layout segment generated.
  fallbackImage?: string
}

const buildBusinessMetadata = ({
  business,
  path,
  title,
  description = describeBusiness(business),
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
      ...BASE_OPEN_GRAPH,
      url: path,
      title,
      description,
      // Without the key the segment's generated opengraph-image fills it in.
      ...(image && { images: [image] }),
    },
  }
}

export {
  BASE_OPEN_GRAPH,
  buildBusinessMetadata,
  describeBusiness,
  OG_IMAGE_SIZE,
  PLATFORM_OG_IMAGE,
}
