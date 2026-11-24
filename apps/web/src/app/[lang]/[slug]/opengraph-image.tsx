import { msg } from '@lingui/core/macro'
import { ImageResponse } from 'next/og'
import { getBusiness, listReviews } from '@/shared/api/serverApi'
import { getKindLabel } from '@/shared/config/platform'
import { getI18nInstance } from '@/shared/i18n/instances'
import { OG_IMAGE_SIZE } from '@/shared/lib/seo/businessMetadata'
import { getDisplayRating } from '@/shared/lib/seo/displayRating'
import { BusinessOgCard } from '@/shared/lib/seo/OgCard'
import { say } from '@/shared/lib/seo/seoText'

export const alt = 'Online booking on Awaisa'
export const size = OG_IMAGE_SIZE
export const contentType = 'image/png'

const BusinessOgImage = async ({ params }: { params: Promise<{ lang: string; slug: string }> }) => {
  const { lang, slug } = await params
  const i18n = getI18nInstance(lang)
  const [{ business, catalog }, reviews] = await Promise.all([getBusiness(slug), listReviews(slug)])

  return new ImageResponse(
    <BusinessOgCard
      name={business.name}
      kindLabel={say(i18n, getKindLabel(business.kind))}
      address={business.address}
      rating={getDisplayRating(catalog, reviews)}
      reviewsCount={reviews.count}
      slogan={i18n._(msg`Online booking, no calls`)}
    />,
    size,
  )
}

// biome-ignore lint/style/noDefaultExport: Next reads metadata routes from the default export
export default BusinessOgImage
