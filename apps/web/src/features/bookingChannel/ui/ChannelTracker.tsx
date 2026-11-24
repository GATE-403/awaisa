'use client'

import { useEffect } from 'react'
import { usePathname } from '@/shared/i18n/navigation'
import { rememberPage } from '@/shared/lib/bookingChannel'

// Every page the tab shows tells where the next booking will come from (`bookingChannel.ts`).
export const ChannelTracker = () => {
  const pathname = usePathname()

  useEffect(() => {
    rememberPage(pathname)
  }, [pathname])

  return null
}
