'use client'

import { useLingui } from '@lingui/react/macro'
import { CalendarFeedGroup } from '@/features/calendarFeed'
import { PushAlertsGroup } from '@/features/pushAlerts'
import type { Specialist } from '@/shared/api/types'
import forms from '@/views/manage/ui/manageForms.module.css'
import { ClientChannelNote } from '@/views/manage/ui/NotificationsTab/ClientChannelNote'
import { SectionHeader } from '@/views/manage/ui/SectionHeader/SectionHeader'
import { TelegramSection } from '@/views/manage/ui/TelegramSection/TelegramSection'

interface NotificationsTabProps {
  slug: string
  specialists: Specialist[]
}

export const NotificationsTab = ({ slug, specialists }: NotificationsTabProps) => {
  const { t } = useLingui()

  return (
    <section className={forms.section}>
      <SectionHeader
        title={t`Notifications`}
        description={t`New bookings, moves and cancellations: on your phone and in Telegram, as they happen.`}
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
          <p className={forms.groupEmpty}>
            {t`The Telegram bot is not connected to the platform yet.`}
          </p>
        }
      />
      <ClientChannelNote />
    </section>
  )
}
