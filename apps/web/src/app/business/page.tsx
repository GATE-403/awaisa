import type { Metadata } from 'next'
import { ForBusinessPage } from '@/views/forBusiness'

export const metadata: Metadata = {
  title: 'Online booking for businesses',
  description:
    'A booking page for a salon or a specialist in five minutes: services, specialists, hours and reminders.',
}

const ForBusinessRoute = () => <ForBusinessPage />

export default ForBusinessRoute
