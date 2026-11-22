'use client'

import { CalendarFeedGroup } from '@/features/calendarFeed'
import { PushAlertsGroup } from '@/features/pushAlerts'
import type { Specialist } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import forms from '@/views/manage/ui/manageForms.module.css'
import { ClientChannelNote } from '@/views/manage/ui/NotificationsTab/ClientChannelNote'
import { SectionHeader } from '@/views/manage/ui/SectionHeader/SectionHeader'
import { TelegramSection } from '@/views/manage/ui/TelegramSection/TelegramSection'

interface NotificationsTabProps {
  slug: string
  specialists: Specialist[]
}

export const NotificationsTab = ({ slug, specialists }: NotificationsTabProps) => {
  const t = useT()

  return (
    <section className={forms.section}>
      <SectionHeader
        title={t('Уведомления')}
        description={t(
          'Новые записи, переносы и отмены: на телефоне и в Telegram, сразу как они случаются.',
        )}
      />
      <PushAlertsGroup audience='business' listClassName={forms.list} />
      <CalendarFeedGroup
        scope={{ kind: 'business', slug }}
        masters={specialists.filter((specialist) => specialist.isActive !== false)}
        canSetPhones
        listClassName={forms.list}
      />
      <TelegramSection
        slug={slug}
        fallback={
          <p className={forms.groupEmpty}>{t('Telegram-бот ещё не подключён к платформе.')}</p>
        }
      />
      <ClientChannelNote />
    </section>
  )
}
