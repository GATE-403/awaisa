import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { SessionProvider } from '@/entities/session'
import { getMasterPlacesOnServer, requireCustomer } from '@/shared/api/sessionApi'
import { PageSkeleton } from '@/shared/ui/PageSkeleton/PageSkeleton'
import { MasterPlacesPage } from '@/views/masterDay'

export const metadata: Metadata = {
  title: 'My day',
  robots: { index: false },
}

const MasterPlacesWithSession = async () => {
  const customer = await requireCustomer('/master')
  const places = await getMasterPlacesOnServer()
  // One place: its day straight away.
  const [only] = places ?? []
  if (places?.length === 1 && only) redirect(`/master/${only.slug}`)

  return (
    <SessionProvider customer={customer}>
      <MasterPlacesPage initialPlaces={places} />
    </SessionProvider>
  )
}

const MasterIndexRoute = () => (
  <Suspense fallback={<PageSkeleton />}>
    <MasterPlacesWithSession />
  </Suspense>
)

export default MasterIndexRoute
