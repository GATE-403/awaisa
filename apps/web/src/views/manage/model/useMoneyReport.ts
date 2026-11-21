'use client'

import { useEffect, useState } from 'react'
import { getMoneyReport } from '@/shared/api/clientApi'
import type { AnalyticsDays, MoneyReport } from '@/shared/api/types'

// «Прибыль» for the analytics period; nothing on screen when it cannot be read (staff, an error).
export const useMoneyReport = (slug: string, days: AnalyticsDays) => {
  const [report, setReport] = useState<MoneyReport | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    getMoneyReport(slug, days, controller.signal)
      .then(setReport)
      .catch(() => undefined)
    return () => controller.abort()
  }, [slug, days])

  return report
}
