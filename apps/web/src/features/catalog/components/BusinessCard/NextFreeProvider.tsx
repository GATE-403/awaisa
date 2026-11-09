'use client'

import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'
import { getNextFree } from '@/common/api/clientApi'
import type { NextFree } from '@/common/api/types'

interface NextFreeProviderProps {
  slugs: string[]
  children: ReactNode
}

// undefined while loading, so cards keep their line height instead of jumping.
const NextFreeContext = createContext<NextFree | undefined>(undefined)

// One request for the whole catalog instead of one per card.
export const NextFreeProvider = ({ slugs, children }: NextFreeProviderProps) => {
  const [nextFree, setNextFree] = useState<NextFree | undefined>(undefined)
  const key = slugs.join(',')

  useEffect(() => {
    if (!key) return

    const controller = new AbortController()
    getNextFree(key.split(','), controller.signal)
      .then(setNextFree)
      .catch(() => {
        if (!controller.signal.aborted) setNextFree({})
      })

    return () => controller.abort()
  }, [key])

  return <NextFreeContext value={nextFree}>{children}</NextFreeContext>
}

export const useNextFree = () => useContext(NextFreeContext)
