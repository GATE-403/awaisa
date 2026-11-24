import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoginPage } from '@/views/auth'

export const metadata: Metadata = {
  title: 'Sign-in',
}

const LoginRoute = () => (
  <Suspense>
    <LoginPage />
  </Suspense>
)

export default LoginRoute
