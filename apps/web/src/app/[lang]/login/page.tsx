import { msg } from '@lingui/core/macro'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { initLingui } from '@/shared/i18n/server'
import { LoginPage } from '@/views/auth'

export const generateMetadata = async (): Promise<Metadata> => {
  const i18n = await initLingui()

  return {
    title: i18n._(msg`Sign-in`),
  }
}

const LoginRoute = async () => {
  await initLingui()

  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  )
}

export default LoginRoute
