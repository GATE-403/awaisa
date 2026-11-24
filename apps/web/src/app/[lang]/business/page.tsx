import { msg } from '@lingui/core/macro'
import type { Metadata } from 'next'
import { initLingui } from '@/shared/i18n/server'
import { ForBusinessPage } from '@/views/forBusiness'

export const generateMetadata = async (): Promise<Metadata> => {
  const i18n = await initLingui()

  return {
    title: i18n._(msg`Online booking for businesses`),
    description: i18n._(
      msg`A booking page for a salon or a specialist in five minutes: services, specialists, hours and reminders.`,
    ),
  }
}

const ForBusinessRoute = async () => {
  await initLingui()

  return <ForBusinessPage />
}

export default ForBusinessRoute
