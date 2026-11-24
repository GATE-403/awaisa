'use client'

import { useEffect } from 'react'
import { useUpdatesSeen } from '@/shared/lib/hooks/useUpdatesSeen'

// Opening the page reads the news: the dot by "What's new" in the cabinet goes out.
export const MarkUpdatesSeen = () => {
  const { markSeen } = useUpdatesSeen()

  useEffect(() => {
    markSeen()
  }, [markSeen])

  return null
}
