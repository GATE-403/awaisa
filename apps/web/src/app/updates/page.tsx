import type { Metadata } from 'next'
import { UpdatesPage } from '@/views/updates'

export const metadata: Metadata = {
  title: "What's new",
  description: 'Awaisa updates: what changed for clients and for businesses.',
}

const UpdatesRoute = () => <UpdatesPage />

export default UpdatesRoute
