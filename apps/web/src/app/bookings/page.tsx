import type { Metadata } from 'next'
import { BookingsPage } from '@/views/bookings'

export const metadata: Metadata = {
  title: 'Профиль и записи',
}

const BookingsRoute = () => <BookingsPage />

export default BookingsRoute
