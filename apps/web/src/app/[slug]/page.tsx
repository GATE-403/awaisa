import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getBusiness } from '@/common/api/serverApi'
import { PageSkeleton } from '@/common/components/PageSkeleton/PageSkeleton'
import { BusinessHomePage } from '@/features/business/BusinessHomePage'

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
