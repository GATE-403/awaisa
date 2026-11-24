import { msg } from '@lingui/core/macro'
import type { Metadata } from 'next'
import { initLingui } from '@/shared/i18n/server'
import { UpdatesPage } from '@/views/updates'

export const generateMetadata = async (): Promise<Metadata> => {
  const i18n = await initLingui()

  return {
    title: i18n._(msg`What's new`),
    description: i18n._(msg`Awaisa updates: what changed for clients and for businesses.`),
  }
}

const UpdatesRoute = async () => {
  await initLingui()

  return <UpdatesPage />
}

export default UpdatesRoute
