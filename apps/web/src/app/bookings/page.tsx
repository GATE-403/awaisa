import type { Metadata } from 'next'
import { BookingsPage } from '@/features/bookings/BookingsPage'

export const metadata: Metadata = {
  title: 'Мои записи',
}

const BookingsRoute = () => <BookingsPage />

export default BookingsRoute
