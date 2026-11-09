'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { isCabinetPath } from '@/constants/navigation'

interface FooterGateProps {
  children: ReactNode
}

export const FooterGate = ({ children }: FooterGateProps) => {
  const pathname = usePathname()

  return isCabinetPath(pathname) ? null : children
}
