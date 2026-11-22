import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { getBusiness, listServicePhotos } from '@/shared/api/serverApi'
import {
  BookingPage,
  BookingReturnOnReload,
  BookingSheet,
  BookingSkeleton,
  PlaceUnderBooking,
} from '@/views/booking'
import { BusinessHomePage, PlaceSkeleton } from '@/views/business'
import { CatalogSkeleton } from '@/views/catalog'

export const generateMetadata = async ({
  params,
}: PageProps<'/[slug]/book'>): Promise<Metadata> => {
  const { business } = await getBusiness((await params).slug)

  return { title: `Онлайн-запись — ${business.name}` }
}

const BookingWithBusiness = async ({ slug }: { slug: string }) => {
  // Drawn per request: the form opens on what the link asks for (`?service=`, `?specialist=`,
  // `?time=`), which a cached page could only show after scripts load.
  await connection()
  const [{ business, catalog }, servicePhotos] = await Promise.all([
    getBusiness(slug),
    listServicePhotos(slug),
  ])

  return (
    <BookingSheet closeHref={`/${slug}`}>
      <BookingPage business={business} catalog={catalog} servicePhotos={servicePhotos} />
    </BookingSheet>
  )
}

// A link from outside (an SMS, 2GIS, a QR code) or a reload opens the booking as a full route.
// The place's own page sits under the sheet, dimmed, as when «Записаться» is tapped on it — on
// wide screens the sheet is a side panel, and an empty page beside it read as a broken site.
// Its own Suspense, after the booking: the sheet streams first and never waits for the page.
// `BookingReturnOnReload` sits in the static shell, so it runs before the form and the place
// stream in: a reload of a booking opened over the catalog goes back over the catalog.
const BookRoute = ({ params }: PageProps<'/[slug]/book'>) => (
  <>
    <BookingReturnOnReload />
    <Suspense fallback={<BookingSkeleton />}>
      {params.then(({ slug }) => (
        <BookingWithBusiness slug={slug} />
      ))}
    </Suspense>
    <PlaceUnderBooking catalogSkeleton={<CatalogSkeleton />}>
      <Suspense fallback={<PlaceSkeleton />}>
        {params.then(({ slug }) => (
          <BusinessHomePage slug={slug} />
        ))}
      </Suspense>
    </PlaceUnderBooking>
  </>
)

export default BookRoute
