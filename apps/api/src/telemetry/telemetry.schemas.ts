import type {
  DeviceProfile,
  FunnelEventsInput as FunnelEventsShape,
  FunnelFlow,
  FunnelStep,
} from '@awaisa/contracts'
import { z } from 'zod'

// Each flow's steps in the order people go through them. A step belongs to one flow, so the
// web sends only the step and the flow is worked out here. `signals` are trouble, not progress.
const FUNNELS = {
  booking: [
    'catalog',
    'business',
    'booking_open',
    'service',
    'specialist',
    'time',
    'contacts',
    'booked',
  ],
  search: ['search_open', 'search_typed', 'search_results', 'search_pick'],
  login: ['login_open', 'otp_sent', 'otp_ok', 'login_done'],
  manage_booking: ['ticket_open', 'reschedule_open', 'reschedule_done', 'cancel', 'cancel_undone'],
  prepayment: ['deposit_shown', 'checkout_open', 'pay_click', 'paid'],
  waitlist: ['full_day_shown', 'waitlist_open', 'waitlist_joined'],
  review: ['review_open', 'review_rated', 'review_sent'],
  owner: [
    'business_landing',
    'register_name',
    'register_kind',
    'register_services',
    'register_contacts',
    'register_done',
  ],
  signals: ['form_error', 'toast_action', 'search_empty', 'otp_error', 'pay_failed'],
} as const satisfies Record<FunnelFlow, readonly FunnelStep[]>

type ListedStep = (typeof FUNNELS)[FunnelFlow][number]
// A step added to the contract but to no flow fails here, not in a report.
const everyStepListed: Exclude<FunnelStep, ListedStep> extends never ? true : never = true

const FUNNEL_FLOWS = Object.keys(FUNNELS) as FunnelFlow[]
const FUNNEL_STEPS = Object.values(FUNNELS).flat() as FunnelStep[]
const STEP_FLOW = new Map<FunnelStep, FunnelFlow>(
  FUNNEL_FLOWS.flatMap((flow) => FUNNELS[flow].map((step) => [step, flow] as const)),
)

const SESSION_SCHEMA = z.string().regex(/^[A-Za-z0-9-]{8,40}$/)
// Codes only: a field's name, a channel, a kind of action — never something a person typed.
const CODE = z.string().regex(/^[a-z0-9_]{1,24}$/)

const deviceSchema = z.object({
  type: z.enum(['phone', 'tablet', 'desktop']),
  os: z.enum(['ios', 'android', 'other']),
  app: z.enum(['web', 'native']),
  textScale: z.enum(['normal', 'large', 'huge']),
  net: z.enum(['slow', 'fast', 'unknown']),
  lang: z.enum(['ru', 'ky', 'en']),
  reducedMotion: z.boolean(),
  contrastMore: z.boolean(),
  dark: z.boolean(),
}) satisfies z.ZodType<DeviceProfile>

const funnelEventsSchema = z.object({
  session: SESSION_SCHEMA,
  events: z
    .array(
      z.object({
        step: z.enum(FUNNEL_STEPS as [FunnelStep, ...FunnelStep[]]),
        slug: z.string().trim().max(64).optional(),
        meta: z
          .object({ field: CODE.optional(), channel: CODE.optional(), kind: CODE.optional() })
          .strict()
          .optional(),
      }),
    )
    .min(1)
    .max(50),
  device: deviceSchema.optional(),
}) satisfies z.ZodType<FunnelEventsShape>

const clientErrorSchema = z.object({
  session: SESSION_SCHEMA.optional(),
  message: z.string().trim().min(1).max(500),
  stack: z.string().max(4000).default(''),
  url: z.string().max(500).default(''),
})

const telemetryReportSchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
})

const funnelReportSchema = telemetryReportSchema.extend({
  flow: z.enum(FUNNEL_FLOWS as [FunnelFlow, ...FunnelFlow[]]).default('booking'),
  type: deviceSchema.shape.type.optional(),
  os: deviceSchema.shape.os.optional(),
  app: deviceSchema.shape.app.optional(),
  textScale: deviceSchema.shape.textScale.optional(),
  net: deviceSchema.shape.net.optional(),
})

type FunnelEventsInput = z.infer<typeof funnelEventsSchema>
type ClientErrorInput = z.infer<typeof clientErrorSchema>
type FunnelReportQuery = z.infer<typeof funnelReportSchema>

export type { ClientErrorInput, FunnelEventsInput, FunnelReportQuery, FunnelStep }
export {
  clientErrorSchema,
  everyStepListed,
  FUNNEL_FLOWS,
  FUNNEL_STEPS,
  FUNNELS,
  funnelEventsSchema,
  funnelReportSchema,
  STEP_FLOW,
  telemetryReportSchema,
}
