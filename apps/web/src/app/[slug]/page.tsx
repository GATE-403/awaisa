import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getBusiness } from '@/shared/api/serverApi'
import { buildBusinessMetadata } from '@/shared/lib/seo/businessMetadata'
import { BusinessHomePage, PlaceSkeleton } from '@/views/business'

export const generateMetadata = async ({ params }: PageProps<'/[slug]'>): Promise<Metadata> => {
  const { business } = await getBusiness((await params).slug)

  return buildBusinessMetadata({
    business,
    path: `/${business.slug}`,
    title: `${business.name} - онлайн-запись`,
  })
}

const BusinessRoute = ({ params }: PageProps<'/[slug]'>) => (
  <Suspense fallback={<PlaceSkeleton />}>
    {params.then(({ slug }) => (
      <BusinessHomePage slug={slug} />
    ))}
  </Suspense>
)

export default BusinessRoute
