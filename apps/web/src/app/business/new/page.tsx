import type { Metadata } from 'next'
import { CreateBusinessPage } from '@/features/forBusiness/CreateBusinessPage'

export const metadata: Metadata = {
  title: 'Новая страница бизнеса',
  robots: { index: false },
}

const CreateBusinessRoute = () => <CreateBusinessPage />

export default CreateBusinessRoute
