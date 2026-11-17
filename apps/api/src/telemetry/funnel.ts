import type { FunnelRow, FunnelStep } from '@awaisa/contracts'
import { FUNNELS } from './telemetry.schemas.js'

type StepCount = { step: FunnelStep; sessions: number }

/**
 * Sessions per step in the flow's order, with the share kept from the step before and from the
 * flow's first step. A step nobody reached shows 0, so the table always has every step.
 */
const buildFunnel = (
  rows: StepCount[],
  steps: readonly FunnelStep[] = FUNNELS.booking,
): FunnelRow[] => {
  const counts = new Map(rows.map((row) => [row.step, row.sessions]))
  const first = counts.get(steps[0] as FunnelStep) ?? 0
  let previous: number | null = null

  return steps.map((step) => {
    const sessions = counts.get(step) ?? 0
    const fromPrevious = previous ? Math.round((sessions / previous) * 1000) / 10 : null
    const fromStart = first ? Math.round((sessions / first) * 1000) / 10 : null
    previous = sessions
    return { step, sessions, fromPrevious, fromStart }
  })
}

export { buildFunnel }
