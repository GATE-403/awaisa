import type { Metadata } from 'next'
import { MasterPlacesPage } from '@/views/masterDay'

export const metadata: Metadata = {
  title: 'Мой день',
  robots: { index: false },
}

const MasterIndexRoute = () => <MasterPlacesPage />

export default MasterIndexRoute
