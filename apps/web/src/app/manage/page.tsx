import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { SessionProvider } from '@/entities/session'
import { getMyBusinessesOnServer, requireCustomer } from '@/shared/api/sessionApi'
import { PageSkeleton } from '@/shared/ui/PageSkeleton/PageSkeleton'
import { ManageIndexPage } from '@/views/manage'

export const metadata: Metadata = {
  title: 'My businesses',
  robots: { index: false },
}

const ManageIndexWithSession = async () => {
  const customer = await requireCustomer('/manage')
  const businesses = await getMyBusinessesOnServer()
  // One business: straight into its cabinet, no list to tap through.
  const [only] = businesses ?? []
  if (businesses?.length === 1 && only) redirect(`/manage/${only.slug}`)

  return (
    <SessionProvider customer={customer}>
      <ManageIndexPage initialBusinesses={businesses} />
    </SessionProvider>
  )
}

const ManageIndexRoute = () => (
  <Suspense fallback={<PageSkeleton />}>
    <ManageIndexWithSession />
  </Suspense>
)

export default ManageIndexRoute
