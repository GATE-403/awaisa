import type { Metadata } from 'next'
import { Suspense } from 'react'
import { BubbleCloud, LoginBubbles, LoginPage } from '@/views/auth'

export const metadata: Metadata = {
  title: 'Вход',
}

const LoginRoute = () => (
  <Suspense>
    <LoginPage
      hero={
        <Suspense fallback={<BubbleCloud pictures={[]} />}>
          <LoginBubbles />
        </Suspense>
      }
    />
  </Suspense>
)

export default LoginRoute
