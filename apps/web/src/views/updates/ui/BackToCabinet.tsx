'use client'

import { useLingui } from '@lingui/react/macro'
import { useEffect, useState } from 'react'
import { useRootFlag } from '@/shared/lib/hooks/useRootFlag'
import { getSafeRedirect } from '@/shared/lib/safeRedirect'
import { forgetUpdatesFrom, readUpdatesFrom } from '@/shared/lib/updatesFrom'
import { CabinetBar } from '@/widgets/CabinetBar'

// Opened from the cabinet's megaphone, "What's new" keeps the cabinet's own toolbar - "‹ Dashboard"
// back to that business and tab, then the tools - instead of the client header, which has no way
// back there. Read after mount (the page itself is static) and forgotten when the page is left.
export const BackToCabinet = () => {
  const { t } = useLingui()
  const [from, setFrom] = useState<string | null>(null)
  useRootFlag(from ? 'cabinet-chrome' : null)

  useEffect(() => {
    const saved = readUpdatesFrom()
    if (saved?.startsWith('/manage')) setFrom(getSafeRedirect(saved))
    return forgetUpdatesFrom
  }, [])

  if (!from) return null

  return <CabinetBar title={t`What's new`} back={{ href: from, label: t`Dashboard` }} />
}
