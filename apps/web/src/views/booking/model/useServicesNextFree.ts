'use client'

import { useEffect, useState } from 'react'
import { getServicesNextFree } from '@/shared/api/clientApi'
import type { NextFree } from '@/shared/api/types'

const RETRY_MS = 1500

/** Each service's first free time (any master) today or tomorrow, for the service list. */
export const useServicesNextFree = (slug: string, branchId?: string) => {
  const key = `${slug}|${branchId ?? ''}`
  const [result, setResult] = useState<{ key: string; times: NextFree } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    let retry: ReturnType<typeof setTimeout> | undefined
    const load = (isRetry: boolean) =>
      getServicesNextFree(slug, branchId, controller.signal)
        .then((times) => setResult({ key, times }))
        .catch(() => {
          // One failed request on a weak connection would leave the list without times for good.
          if (!isRetry && !controller.signal.aborted) retry = setTimeout(() => load(true), RETRY_MS)
        })
    void load(false)
    return () => {
      controller.abort()
      clearTimeout(retry)
    }
  }, [slug, branchId, key])

  return result?.key === key ? result.times : null
}
