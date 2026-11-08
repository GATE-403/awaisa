import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoginPage } from '@/features/auth/LoginPage'

export const metadata: Metadata = {
  title: 'Вход',
}

const LoginRoute = () => (
  <Suspense>
    <LoginPage />
  </Suspense>
)

export default LoginRoute
