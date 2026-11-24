import type { Metadata } from 'next'
import { UpdatesPage } from '@/views/updates'

export const metadata: Metadata = {
  title: "What's new",
  description: 'Обновления Awaisa: что изменилось для клиентов и для бизнеса.',
}

const UpdatesRoute = () => <UpdatesPage />

export default UpdatesRoute
