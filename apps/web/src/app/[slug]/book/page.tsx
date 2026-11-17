import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getBusiness, listServicePhotos } from '@/shared/api/serverApi'
import { BookingPage, BookingSkeleton } from '@/views/booking'
import { BusinessHomePage, PlaceSkeleton } from '@/views/business'

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

// A link from outside (an SMS, 2GIS, a QR code) or a reload opens the booking as a full route.
// The place's own page sits under the sheet, dimmed, as when «Записаться» is tapped on it — on
// wide screens the sheet is a side panel, and an empty page beside it read as a broken site.
// Its own Suspense, after the booking: the sheet streams first and never waits for the page.
const BookRoute = ({ params }: PageProps<'/[slug]/book'>) => (
  <>
    <Suspense fallback={<BookingSkeleton />}>
      {params.then(({ slug }) => (
        <BookingWithBusiness slug={slug} />
      ))}
    </Suspense>
    <Suspense fallback={<PlaceSkeleton />}>
      {params.then(({ slug }) => (
        <BusinessHomePage slug={slug} />
      ))}
    </Suspense>
  </>
)

export default BookRoute
