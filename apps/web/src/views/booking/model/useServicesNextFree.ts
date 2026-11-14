'use client'

import { useEffect, useState } from 'react'
import { getServicesNextFree } from '@/shared/api/clientApi'
import type { NextFree } from '@/shared/api/types'

/** Each service's first free time (any master) today or tomorrow, for the service list. */
export const useServicesNextFree = (slug: string, branchId?: string) => {
  const key = `${slug}|${branchId ?? ''}`
  const [result, setResult] = useState<{ key: string; times: NextFree } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    getServicesNextFree(slug, branchId, controller.signal)
      .then((times) => setResult({ key, times }))
      .catch(() => undefined)
    return () => controller.abort()
  }, [slug, branchId, key])

  return result?.key === key ? result.times : null
}
