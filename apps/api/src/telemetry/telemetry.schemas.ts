import { z } from 'zod'

// The booking funnel, in the order people go through it.
const FUNNEL_STEPS = [
  'catalog',
  'business',
  'booking_open',
  'service',
  'specialist',
  'time',
  'contacts',
  'booked',
] as const

const SESSION_SCHEMA = z.string().regex(/^[A-Za-z0-9-]{8,40}$/)

const funnelEventsSchema = z.object({
  session: SESSION_SCHEMA,
  events: z
    .array(
      z.object({
        step: z.enum(FUNNEL_STEPS),
        slug: z.string().trim().max(64).optional(),
      }),
    )
    .min(1)
    .max(50),
})

const clientErrorSchema = z.object({
  session: SESSION_SCHEMA.optional(),
  message: z.string().trim().min(1).max(500),
  stack: z.string().max(4000).default(''),
  url: z.string().max(500).default(''),
})

const telemetryReportSchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
})

type FunnelEventsInput = z.infer<typeof funnelEventsSchema>
type ClientErrorInput = z.infer<typeof clientErrorSchema>
type FunnelStep = (typeof FUNNEL_STEPS)[number]

export type { ClientErrorInput, FunnelEventsInput, FunnelStep }
export { clientErrorSchema, FUNNEL_STEPS, funnelEventsSchema, telemetryReportSchema }
