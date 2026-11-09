import type { Metadata } from 'next'
import { BookingsPage } from '@/views/bookings'

export const metadata: Metadata = {
  title: 'Мои записи',
}

const BookingsRoute = () => <BookingsPage />

export default BookingsRoute
