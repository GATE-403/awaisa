import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getBusiness, listServicePhotos } from '@/shared/api/serverApi'
import { PageSkeleton } from '@/shared/ui/PageSkeleton/PageSkeleton'
import { BookingPage } from '@/views/booking'

export const generateMetadata = async ({
  params,
}: PageProps<'/[slug]/book'>): Promise<Metadata> => {
  const { business } = await getBusiness((await params).slug)

  return { title: `Онлайн-запись — ${business.name}` }
}

const BookingWithBusiness = async ({ slug }: { slug: string }) => {
  const [{ business, catalog }, servicePhotos] = await Promise.all([
    getBusiness(slug),
    listServicePhotos(slug),
  ])

  return <BookingPage business={business} catalog={catalog} servicePhotos={servicePhotos} />
}

const BookRoute = ({ params }: PageProps<'/[slug]/book'>) => (
  <Suspense fallback={<PageSkeleton />}>
    {params.then(({ slug }) => (
      <BookingWithBusiness slug={slug} />
    ))}
  </Suspense>
)

export default BookRoute
