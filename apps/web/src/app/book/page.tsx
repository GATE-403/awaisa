import { Skeleton } from '@awaisa/ui/Skeleton'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getCatalog } from '@/common/api/serverApi'
import { Container } from '@/common/components/Container/Container'
import { BookingPage } from '@/features/booking/BookingPage'

export const metadata: Metadata = {
  title: 'Онлайн-запись',
}

const BookingFallback = () => (
  <Container>
    <Skeleton style={{ height: 480, marginTop: 24 }} />
  </Container>
)

const BookingWithCatalog = async () => {
  const catalog = await getCatalog()

  return <BookingPage catalog={catalog} />
}

const BookRoute = () => (
  <Suspense fallback={<BookingFallback />}>
    <BookingWithCatalog />
  </Suspense>
)

export default BookRoute
