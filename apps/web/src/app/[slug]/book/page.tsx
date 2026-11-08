import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getBusiness } from '@/common/api/serverApi'
import { PageSkeleton } from '@/common/components/PageSkeleton/PageSkeleton'
import { BookingPage } from '@/features/booking/BookingPage'

export const generateMetadata = async ({
  params,
}: PageProps<'/[slug]/book'>): Promise<Metadata> => {
  const { business } = await getBusiness((await params).slug)

  return { title: `Онлайн-запись — ${business.name}` }
}

const BookingWithBusiness = async ({ slug }: { slug: string }) => {
  const { business, catalog } = await getBusiness(slug)

  return <BookingPage business={business} catalog={catalog} />
}

const BookRoute = ({ params }: PageProps<'/[slug]/book'>) => (
  <Suspense fallback={<PageSkeleton />}>
    {params.then(({ slug }) => (
      <BookingWithBusiness slug={slug} />
    ))}
  </Suspense>
)

export default BookRoute
