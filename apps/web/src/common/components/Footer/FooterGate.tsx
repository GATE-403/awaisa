'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { isCabinetPath } from '@/constants/navigation'

interface FooterGateProps {
  children: ReactNode
}

export const FooterGate = ({ children }: FooterGateProps) => {
  const pathname = usePathname()

  // The map is a full-window app view, like the cabinet.
  return isCabinetPath(pathname) || pathname === '/map' ? null : children
}
