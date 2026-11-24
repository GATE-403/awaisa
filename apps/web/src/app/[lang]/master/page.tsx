import { msg } from '@lingui/core/macro'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SessionProvider } from '@/entities/session'
import { getMasterPlacesOnServer, requireCustomer } from '@/shared/api/sessionApi'
import { initLingui, redirect } from '@/shared/i18n/server'
import { PageSkeleton } from '@/shared/ui/PageSkeleton/PageSkeleton'
import { MasterPlacesPage } from '@/views/masterDay'

export const generateMetadata = async (): Promise<Metadata> => {
  const i18n = await initLingui()

  return {
    title: i18n._(msg`My day`),
    robots: { index: false },
  }
}

const MasterPlacesWithSession = async () => {
  const customer = await requireCustomer('/master')
  const places = await getMasterPlacesOnServer()
  // One place: its day straight away.
  const [only] = places ?? []
  if (places?.length === 1 && only) await redirect(`/master/${only.slug}`)

  return (
    <SessionProvider customer={customer}>
      <MasterPlacesPage initialPlaces={places} />
    </SessionProvider>
  )
}

const MasterIndexRoute = async () => {
  await initLingui()

  return (
    <Suspense fallback={<PageSkeleton />}>
      <MasterPlacesWithSession />
    </Suspense>
  )
}

export default MasterIndexRoute
