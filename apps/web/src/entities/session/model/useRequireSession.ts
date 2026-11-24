'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from '@/shared/i18n/navigation'
import { useSession } from './useSession'

export const useRequireSession = () => {
  const session = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (session.status === 'guest') {
      router.replace(`/login?${new URLSearchParams({ next: pathname })}`)
    }
  }, [session.status, router, pathname])

  return session
}
