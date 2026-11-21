'use client'

import { PushAlertsGroup } from '@/features/pushAlerts'
import forms from '@/views/manage/ui/manageForms.module.css'
import { ClientChannelNote } from '@/views/manage/ui/NotificationsTab/ClientChannelNote'
import { SectionHeader } from '@/views/manage/ui/SectionHeader/SectionHeader'
import { TelegramSection } from '@/views/manage/ui/TelegramSection/TelegramSection'

interface NotificationsTabProps {
  slug: string
}

export const NotificationsTab = ({ slug }: NotificationsTabProps) => (
  <section className={forms.section}>
    <SectionHeader
      title='Уведомления'
      description='Новые записи, переносы и отмены: на телефоне и в Telegram, сразу как они случаются.'
    />
    <PushAlertsGroup audience='business' listClassName={forms.list} />
    <TelegramSection
      slug={slug}
      fallback={<p className={forms.groupEmpty}>Telegram-бот ещё не подключён к платформе.</p>}
    />
    <ClientChannelNote />
  </section>
)
