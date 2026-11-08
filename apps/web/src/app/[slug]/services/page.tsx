import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getBusiness } from '@/common/api/serverApi'
import { PageSkeleton } from '@/common/components/PageSkeleton/PageSkeleton'
import { ServicesPage } from '@/features/services/ServicesPage'

export const generateMetadata = async ({
  params,
}: PageProps<'/[slug]/services'>): Promise<Metadata> => {
  const { business } = await getBusiness((await params).slug)

  return { title: `Услуги и цены — ${business.name}` }
}

const ServicesRoute = ({ params }: PageProps<'/[slug]/services'>) => (
  <Suspense fallback={<PageSkeleton />}>
    {params.then(({ slug }) => (
      <ServicesPage slug={slug} />
    ))}
  </Suspense>
)

export default ServicesRoute
