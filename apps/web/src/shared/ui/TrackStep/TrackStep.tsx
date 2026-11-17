'use client'

import { useEffect } from 'react'
import type { FunnelStep } from '@/shared/api/types'
import { trackStep } from '@/shared/lib/telemetry'

interface TrackStepProps {
  step: FunnelStep
  slug?: string
}

// Counts a funnel step from a server-rendered page, which cannot run an effect itself.
export const TrackStep = ({ step, slug }: TrackStepProps) => {
  useEffect(() => {
    trackStep(step, slug)
  }, [step, slug])

  return null
}
