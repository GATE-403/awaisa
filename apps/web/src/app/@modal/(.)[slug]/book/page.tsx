import { unstable_rethrow } from 'next/navigation'
import { Suspense } from 'react'
import { findBusiness } from '@/shared/api/serverApi'
import { BookingPage, BookingUnavailable } from '@/views/booking'

const BookingOverPage = async ({ slug }: { slug: string }) => {
  // Over a page, a failed read (the API down, a removed place) must not replace the whole screen
  // with «Не нашли» and leave the slot stuck: a small sheet says so and closes back. Next's own
  // signals (prerender aborts, postpones) are not failures and go through untouched.
  let data: Awaited<ReturnType<typeof findBusiness>> = null
  try {
    data = await findBusiness(slug)
  } catch (error) {
    unstable_rethrow(error)
  }
  if (!data) return <BookingUnavailable />

  return <BookingPage business={data.business} catalog={data.catalog} isModal />
}

// «Записаться» tapped on a page opens the booking over that page (an intercepted route): the page
// stays behind the panel, dimmed, and closing goes back to it. A link from outside (or a reload)
// opens the full /<slug>/book route instead.
// Next 16 in dev can hand the intercepted segment over with its interception markers glued on
// («(.)(.)old-school»); the slug is what follows them.
const toSlug = (param: string) => decodeURIComponent(param).replace(/^(\(\.{1,3}\))+/, '')

const BookModal = ({ params }: PageProps<'/[slug]/book'>) => (
  <Suspense fallback={null}>
    {params.then(({ slug }) => (
      <BookingOverPage slug={toSlug(slug)} />
    ))}
  </Suspense>
)

export default BookModal
