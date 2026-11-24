import { msg } from '@lingui/core/macro'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SessionProvider } from '@/entities/session'
import { getMyBookingsOnServer, getSessionCustomer } from '@/shared/api/sessionApi'
import { initLingui } from '@/shared/i18n/server'
import { BookingsPage } from '@/views/bookings'

export const generateMetadata = async (): Promise<Metadata> => {
  const i18n = await initLingui()

  return {
    title: i18n._(msg`Profile and bookings`),
  }
}

// The account and its bookings come from the server with the page; device bookings (guests)
// still join on the client from localStorage.
const BookingsWithSession = async () => {
  const customer = await getSessionCustomer()
  const bookings = customer ? await getMyBookingsOnServer() : null

  return (
    <SessionProvider customer={customer}>
      <BookingsPage initialAccountBookings={bookings} />
    </SessionProvider>
  )
}

const BookingsRoute = async () => {
  await initLingui()

  return (
    <Suspense fallback={<BookingsPage />}>
      <BookingsWithSession />
    </Suspense>
  )
}

export default BookingsRoute
