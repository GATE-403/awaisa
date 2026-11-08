import type { Metadata } from 'next'
import { Suspense } from 'react'
import { PageSkeleton } from '@/common/components/PageSkeleton/PageSkeleton'
import { ManagePage } from '@/features/manage/ManagePage'

export const metadata: Metadata = {
  title: 'Кабинет',
  robots: { index: false },
}

const ManageRoute = ({ params }: PageProps<'/manage/[slug]'>) => (
  <Suspense fallback={<PageSkeleton />}>
    {params.then(({ slug }) => (
      <ManagePage slug={slug} />
    ))}
  </Suspense>
)

export default ManageRoute
