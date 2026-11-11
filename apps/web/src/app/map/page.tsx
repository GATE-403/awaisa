import type { Metadata } from 'next'
import { Suspense } from 'react'
import { listMapPlaces } from '@/shared/api/serverApi'
import { BUSINESS_KINDS } from '@/shared/config/platform'
import { MapPage } from '@/views/map'

export const metadata: Metadata = {
  title: 'Карта',
  description: 'Салоны и мастера рядом с вами — на карте, со свободным временем.',
}

// The first list comes from the server cache; «Рядом со мной» re-sorts it on the client.
const MapWithPlaces = async ({ kindParam }: { kindParam: unknown }) => {
  const kind = BUSINESS_KINDS.find((item) => item.value === kindParam)?.value
  const places = await listMapPlaces(kind).catch(() => null)

  return <MapPage kind={kind} initialPlaces={places} />
}

const MapRoute = ({ searchParams }: PageProps<'/map'>) => (
  <Suspense fallback={<MapPage isPending />}>
    {searchParams.then((query) => (
      <MapWithPlaces kindParam={query.kind} />
    ))}
  </Suspense>
)

export default MapRoute
