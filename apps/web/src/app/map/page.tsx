import type { Metadata } from 'next'
import { Suspense } from 'react'
import { MapPage } from '@/views/map'

export const metadata: Metadata = {
  title: 'Карта',
  description: 'Салоны и мастера рядом с вами — на карте, со свободным временем.',
}

const MapRoute = () => (
  <Suspense>
    <MapPage />
  </Suspense>
)

export default MapRoute
