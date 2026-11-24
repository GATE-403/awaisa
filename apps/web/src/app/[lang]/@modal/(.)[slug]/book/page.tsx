import { unstable_rethrow } from 'next/navigation'
import { Suspense } from 'react'
import { findBusiness, listServicePhotos } from '@/shared/api/serverApi'
import { initLingui } from '@/shared/i18n/server'
import {
  BookingLayer,
  BookingModalGate,
  BookingPage,
  BookingSheet,
  BookingSheetPlaceholder,
  BookingUnavailable,
} from '@/views/booking'

const BookingOverPage = async ({ slug }: { slug: string }) => {
  // Over a page, a failed read (the API down, a removed place) must not replace the whole screen
  // with "Not found" and leave the slot stuck: a small sheet says so and closes back. Next's own
  // signals (prerender aborts, postpones) are not failures and go through untouched.
  let data: Awaited<ReturnType<typeof findBusiness>> = null
  let servicePhotos: Record<string, string> = {}
  try {
    ;[data, servicePhotos] = await Promise.all([findBusiness(slug), listServicePhotos(slug)])
  } catch (error) {
    unstable_rethrow(error)
  }
  if (!data) return <BookingUnavailable />

  return (
    <BookingPage
      business={data.business}
      catalog={data.catalog}
      servicePhotos={servicePhotos}
      isModal
    />
  )
}

// "Book" tapped on a page opens the booking over that page (an intercepted route): the page
// stays behind the panel, dimmed, and closing goes back to it. A link from outside (or a reload)
// opens the full /<slug>/book route instead.
// Next 16 in dev can hand the intercepted segment over with its interception markers glued on
// ("(.)(.)old-school"); the slug is what follows them.
const toSlug = (param: string) => decodeURIComponent(param).replace(/^(\(\.{1,3}\))+/, '')

// One sheet from the tap to the finished form: `BookingSheet` sits outside the Suspense that waits
// for the place, and only what it holds changes (the placeholder, then the form). The outer
// Suspense is for the server's HTML only (the sheet reads the address, which a prerender cannot):
// a soft navigation draws the sheet at once.
const BookModal = async ({ params }: PageProps<'/[lang]/[slug]/book'>) => {
  await initLingui()

  return (
    <BookingLayer>
      <Suspense fallback={null}>
        <BookingSheet isModal>
          <Suspense fallback={<BookingSheetPlaceholder />}>
            {params.then(({ slug }) => (
              <BookingModalGate slug={toSlug(slug)}>
                <BookingOverPage slug={toSlug(slug)} />
              </BookingModalGate>
            ))}
          </Suspense>
        </BookingSheet>
      </Suspense>
    </BookingLayer>
  )
}

export default BookModal
