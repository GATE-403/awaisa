import type { Metadata } from 'next'
import { Suspense } from 'react'
import { MasterDayPage } from '@/views/masterDay'

export const metadata: Metadata = {
  title: 'Мой день',
  robots: { index: false },
}

const MasterRoute = ({ params }: PageProps<'/master/[slug]'>) => (
  <Suspense>
    {params.then(({ slug }) => (
      <MasterDayPage slug={slug} />
    ))}
  </Suspense>
)

export default MasterRoute
