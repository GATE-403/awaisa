import type { Metadata } from 'next'
import { ManageIndexPage } from '@/features/manage/ManageIndexPage'

export const metadata: Metadata = {
  title: 'Мои бизнесы',
  robots: { index: false },
}

const ManageIndexRoute = () => <ManageIndexPage />

export default ManageIndexRoute
