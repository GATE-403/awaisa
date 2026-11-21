'use client'

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
      description='Новые записи, отмены и отзывы — в Telegram, сразу как они случаются.'
    />
    <TelegramSection
      slug={slug}
      fallback={
        <p className={forms.groupEmpty}>
          Telegram-бот ещё не подключён к платформе. Пока о новых записях сообщает кабинет: звук,
          уведомление и тост, пока он открыт.
        </p>
      }
    />
    <ClientChannelNote />
  </section>
)
