'use client'

import { useEffect, useState } from 'react'
import { getErrorMessage } from '@/shared/api/apiError'
import { getAnalytics } from '@/shared/api/clientApi'
import type { AnalyticsDays, AnalyticsReport } from '@/shared/api/types'

export const useAnalytics = (slug: string, days: AnalyticsDays) => {
  const [report, setReport] = useState<AnalyticsReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setError(null)
    getAnalytics(slug, days, controller.signal)
      .then(setReport)
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) setError(getErrorMessage(requestError))
      })

    return () => controller.abort()
  }, [slug, days])

  // The previous period stays on screen while the next one loads, so the layout doesn't jump.
  const isLoading = report === null || report.period.days !== days

  return { report, error, isLoading }
}
