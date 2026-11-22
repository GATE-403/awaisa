'use client'

import { useEffect, useState } from 'react'
import { getErrorMessage } from '@/shared/api/apiError'
import {
  getFunnelReport,
  getFunnelSegments,
  getFunnelSignals,
  getStrategyReport,
} from '@/shared/api/clientApi'
import type {
  FunnelFlow,
  FunnelReport,
  FunnelSegment,
  FunnelSegmentsReport,
  FunnelSignalsReport,
  StrategyReport,
} from '@/shared/api/types'

type InsightsDays = 7 | 30 | 90

type InitialInsights = {
  funnel: FunnelReport | null
  signals: FunnelSignalsReport | null
  segments: FunnelSegmentsReport | null
}

const DEFAULT_DAYS: InsightsDays = 30

// The admins' view of the funnels: one flow at a time, for everyone or one kind of device. The
// server renders the booking funnel for 30 days; any other choice is read here.
const useInsights = (initial: InitialInsights) => {
  const [flow, setFlow] = useState<Exclude<FunnelFlow, 'signals'>>('booking')
  const [days, setDays] = useState<InsightsDays>(DEFAULT_DAYS)
  const [segment, setSegment] = useState<FunnelSegment>({})
  const [funnel, setFunnel] = useState(initial.funnel)
  const [signals, setSignals] = useState(initial.signals)
  const [segments, setSegments] = useState(initial.segments)
  const [strategy, setStrategy] = useState<StrategyReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const segmentKey = JSON.stringify(segment)
  const isInitial = flow === 'booking' && days === DEFAULT_DAYS && segmentKey === '{}'

  // biome-ignore lint/correctness/useExhaustiveDependencies: segmentKey stands for segment
  useEffect(() => {
    if (isInitial && initial.funnel) {
      setFunnel(initial.funnel)
      return
    }
    const controller = new AbortController()
    setIsLoading(true)
    setError(null)
    getFunnelReport({ days, flow, ...segment }, controller.signal)
      .then(setFunnel)
      .catch((loadError) => {
        if (!controller.signal.aborted) setError(getErrorMessage(loadError))
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })
    return () => controller.abort()
  }, [flow, days, segmentKey])

  useEffect(() => {
    if (days === DEFAULT_DAYS && initial.signals && initial.segments) {
      setSignals(initial.signals)
      setSegments(initial.segments)
      return
    }
    const controller = new AbortController()
    Promise.all([
      getFunnelSignals(days, controller.signal),
      getFunnelSegments(days, controller.signal),
    ])
      .then(([nextSignals, nextSegments]) => {
        setSignals(nextSignals)
        setSegments(nextSegments)
      })
      .catch(() => undefined)
    return () => controller.abort()
  }, [days, initial.signals, initial.segments])

  // The strategy numbers follow the period only; read on the client, they are small.
  useEffect(() => {
    const controller = new AbortController()
    getStrategyReport(days, controller.signal)
      .then(setStrategy)
      .catch(() => undefined)
    return () => controller.abort()
  }, [days])

  const setFilter = (key: keyof FunnelSegment, value: string | null) =>
    setSegment((current) => {
      const next = { ...current }
      if (value) Object.assign(next, { [key]: value })
      else delete next[key]
      return next
    })

  return {
    flow,
    setFlow,
    days,
    setDays,
    segment,
    setFilter,
    funnel,
    signals,
    segments,
    strategy,
    isLoading,
    error,
  }
}

export type { InitialInsights, InsightsDays }
export { useInsights }
