import { msg } from '@lingui/core/macro'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { listMapPlaces } from '@/shared/api/serverApi'
import { BUSINESS_KINDS } from '@/shared/config/platform'
import { initLingui } from '@/shared/i18n/server'
import { MapPage } from '@/views/map'

export const generateMetadata = async (): Promise<Metadata> => {
  const i18n = await initLingui()

  return {
    title: i18n._(msg`Map`),
    description: i18n._(msg`Salons and specialists near you on a map, with their free times.`),
    // Kinds are views of this one page.
    alternates: { canonical: '/map' },
  }
}

// The first list comes from the server cache; "Near me" re-sorts it on the client.
const MapWithPlaces = async ({ kindParam }: { kindParam: unknown }) => {
  const kind = BUSINESS_KINDS.find((item) => item.value === kindParam)?.value
  const places = await listMapPlaces(kind).catch(() => null)

  return <MapPage kind={kind} initialPlaces={places} />
}

const MapRoute = async ({ searchParams }: PageProps<'/[lang]/map'>) => {
  await initLingui()

  return (
    <Suspense fallback={<MapPage isPending />}>
      {searchParams.then((query) => (
        <MapWithPlaces kindParam={query.kind} />
      ))}
    </Suspense>
  )
}

export default MapRoute
