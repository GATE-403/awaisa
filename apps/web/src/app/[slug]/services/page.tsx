import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getBusiness } from '@/shared/api/serverApi'
import { PLATFORM } from '@/shared/config/platform'
import { buildBusinessMetadata, describeBusiness } from '@/shared/lib/seo/businessMetadata'
import { ServicesPage, ServicesSkeleton } from '@/views/services'

export const generateMetadata = async ({
  params,
}: PageProps<'/[slug]/services'>): Promise<Metadata> => {
  const { business } = await getBusiness((await params).slug)

  return buildBusinessMetadata({
    business,
    path: `/${business.slug}/services`,
    title: `Services and prices - ${business.name} · ${PLATFORM.name}`,
    description: `Services and prices at ${business.name}: ${describeBusiness(business)}`,
    fallbackImage: `/${business.slug}/opengraph-image`,
  })
}

const ServicesRoute = ({ params }: PageProps<'/[slug]/services'>) => (
  <Suspense fallback={<ServicesSkeleton />}>
    {params.then(({ slug }) => (
      <ServicesPage slug={slug} />
    ))}
  </Suspense>
)

export default ServicesRoute
