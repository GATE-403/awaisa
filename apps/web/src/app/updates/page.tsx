import type { Metadata } from 'next'
import { UpdatesPage } from '@/views/updates'

export const metadata: Metadata = {
  title: 'Что нового',
  description: 'Обновления Awaisa: что изменилось для клиентов и для бизнеса.',
}

const UpdatesRoute = () => <UpdatesPage />

export default UpdatesRoute
