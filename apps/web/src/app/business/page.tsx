import type { Metadata } from 'next'
import { ForBusinessPage } from '@/views/forBusiness'

export const metadata: Metadata = {
  title: 'Онлайн-запись для бизнеса',
  description:
    'Страница записи для салона или мастера за пять минут: услуги, мастера, график и напоминания.',
}

const ForBusinessRoute = () => <ForBusinessPage />

export default ForBusinessRoute
