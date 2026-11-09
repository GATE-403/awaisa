import type { Metadata } from 'next'
import { ManageIndexPage } from '@/views/manage'

export const metadata: Metadata = {
  title: 'Мои бизнесы',
  robots: { index: false },
}

const ManageIndexRoute = () => <ManageIndexPage />

export default ManageIndexRoute
