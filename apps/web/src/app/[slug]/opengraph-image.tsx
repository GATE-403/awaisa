import { ImageResponse } from 'next/og'
import { getBusiness, listReviews } from '@/shared/api/serverApi'
import { getKindLabel } from '@/shared/config/platform'
import { OG_IMAGE_SIZE } from '@/shared/lib/seo/businessMetadata'
import { getDisplayRating } from '@/shared/lib/seo/displayRating'
import { BusinessOgCard } from '@/shared/lib/seo/OgCard'

export const alt = 'Online booking on Awaisa'
export const size = OG_IMAGE_SIZE
export const contentType = 'image/png'

const BusinessOgImage = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params
  const [{ business, catalog }, reviews] = await Promise.all([getBusiness(slug), listReviews(slug)])

  return new ImageResponse(
    <BusinessOgCard
      name={business.name}
      kindLabel={getKindLabel(business.kind)}
      address={business.address}
      rating={getDisplayRating(catalog, reviews)}
      reviewsCount={reviews.count}
    />,
    size,
  )
}

// biome-ignore lint/style/noDefaultExport: Next reads metadata routes from the default export
export default BusinessOgImage
