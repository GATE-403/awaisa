'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from '@/shared/i18n/navigation'
import { rememberCabinetFrom } from '@/shared/lib/cabinetFrom'

/** Notes the page someone came from into the cabinet (once per navigation, read by `CabinetBar`). */
export const useCabinetEntry = () => {
  const pathname = usePathname()
  const lastRef = useRef<string | null>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs on every navigation
  useEffect(() => {
    const current = `${window.location.pathname}${window.location.search}`
    if (lastRef.current) rememberCabinetFrom(lastRef.current, current)
    lastRef.current = current
  }, [pathname])
}
