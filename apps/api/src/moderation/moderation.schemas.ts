import type { ModerationDecisionInput, ReportInput } from '@awaisa/contracts'
import { z } from 'zod'

const TARGET_TYPES = ['photo', 'review', 'profile'] as const
const REASONS = ['spam', 'offensive', 'fake', 'explicit', 'other'] as const
const ACTIONS = ['keep', 'hide', 'delete', 'block'] as const

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PUBLIC_ID = /^[0-9a-f]{20}$/

// Photos and reviews are uuids, people their public id (the one `/u/<id>` shows).
const target = {
  targetType: z.enum(TARGET_TYPES),
  targetId: z.string().max(64),
}

const isValidTarget = (value: { targetType: string; targetId: string }) =>
  value.targetType === 'profile' ? PUBLIC_ID.test(value.targetId) : UUID.test(value.targetId)

const reportSchema = z
  .object({
    ...target,
    reason: z.enum(REASONS),
    session: z.string().trim().min(8).max(64).optional(),
  })
  .refine(isValidTarget, { message: 'Неизвестно, на что жалоба', path: ['targetId'] })

/** The feed's own route keeps working: the photo is in the path, the reason defaults to «Другое». */
const photoReportSchema = z.object({
  reason: z.enum(REASONS).default('other'),
  session: z.string().trim().min(8).max(64).optional(),
})

const decisionSchema = z
  .object({ ...target, action: z.enum(ACTIONS) })
  .refine(isValidTarget, { message: 'Неизвестно, что решать', path: ['targetId'] })

const logQuerySchema = z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) })

type ReportBody = ReportInput
type PhotoReportBody = z.infer<typeof photoReportSchema>
type DecisionBody = ModerationDecisionInput
type LogQuery = z.infer<typeof logQuerySchema>

export type { DecisionBody, LogQuery, PhotoReportBody, ReportBody }
export { decisionSchema, logQuerySchema, photoReportSchema, reportSchema }
