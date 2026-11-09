import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getBusiness } from '@/shared/api/serverApi'
import { PageSkeleton } from '@/shared/ui/PageSkeleton/PageSkeleton'
import { ServicesPage } from '@/views/services'

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
