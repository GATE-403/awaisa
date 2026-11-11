import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SessionProvider } from '@/entities/session'
import { getMyBookingsOnServer, getSessionCustomer } from '@/shared/api/sessionApi'
import { BookingsPage } from '@/views/bookings'

export const metadata: Metadata = {
  title: 'Профиль и записи',
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

const BookingsRoute = () => (
  <Suspense fallback={<BookingsPage />}>
    <BookingsWithSession />
  </Suspense>
)

export default BookingsRoute
