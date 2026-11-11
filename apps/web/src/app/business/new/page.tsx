import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SessionProvider } from '@/entities/session'
import { requireCustomer } from '@/shared/api/sessionApi'
import { PageSkeleton } from '@/shared/ui/PageSkeleton/PageSkeleton'
import { CreateBusinessPage } from '@/views/forBusiness'

export const metadata: Metadata = {
  title: 'Новая страница бизнеса',
  robots: { index: false },
}

// Guests are sent to sign in by the server, before the form flashes.
const CreateWithSession = async () => {
  const customer = await requireCustomer('/business/new')

  return (
    <SessionProvider customer={customer}>
      <CreateBusinessPage />
    </SessionProvider>
  )
}

const CreateBusinessRoute = () => (
  <Suspense fallback={<PageSkeleton />}>
    <CreateWithSession />
  </Suspense>
)

export default CreateBusinessRoute
