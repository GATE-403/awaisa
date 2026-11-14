import { FUNNEL_STEPS, type FunnelStep } from './telemetry.schemas.js'

type FunnelRow = { step: FunnelStep; sessions: number }

/**
 * Sessions per step in funnel order, with the share kept from the step before and from the
 * start. A step nobody reached shows 0, so the table always has every step.
 */
const buildFunnel = (rows: FunnelRow[]) => {
  const counts = new Map(rows.map((row) => [row.step, row.sessions]))
  const first = counts.get(FUNNEL_STEPS[0]) ?? 0
  let previous: number | null = null

  return FUNNEL_STEPS.map((step) => {
    const sessions = counts.get(step) ?? 0
    const fromPrevious = previous ? Math.round((sessions / previous) * 1000) / 10 : null
    const fromStart = first ? Math.round((sessions / first) * 1000) / 10 : null
    previous = sessions
    return { step, sessions, fromPrevious, fromStart }
  })
}

export { buildFunnel }
