import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getBusiness } from '@/shared/api/serverApi'
import { PageSkeleton } from '@/shared/ui/PageSkeleton/PageSkeleton'
import { BusinessHomePage } from '@/views/business'

export const generateMetadata = async ({ params }: PageProps<'/[slug]'>): Promise<Metadata> => {
  const { business } = await getBusiness((await params).slug)

  return {
    title: { absolute: `${business.name} — онлайн-запись` },
    description: business.description,
  }
}

const BusinessRoute = ({ params }: PageProps<'/[slug]'>) => (
  <Suspense fallback={<PageSkeleton />}>
    {params.then(({ slug }) => (
      <BusinessHomePage slug={slug} />
    ))}
  </Suspense>
)

export default BusinessRoute
