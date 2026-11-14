'use client'

import type { ReactNode } from 'react'
import { isBookingPath, isCabinetPath } from '@/shared/config/navigation'
import { useChromePathname } from '@/shared/lib/hooks/useChromePathname'

interface FooterGateProps {
  children: ReactNode
}

export const FooterGate = ({ children }: FooterGateProps) => {
  const pathname = useChromePathname()

  // The map is a full-window app view, like the cabinet; booking keeps the eyes on the form.
  return isCabinetPath(pathname) ||
    isBookingPath(pathname) ||
    pathname === '/map' ||
    pathname === '/feed'
    ? null
    : children
}
