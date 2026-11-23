import { z } from 'zod'

const DATE_SCHEMA = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате YYYY-MM-DD')

const joinWaitlistSchema = z.object({
  serviceId: z.string().trim().min(1).max(64),
  /** The visit's other services, after the first (manicure and pedicure). */
  extraServiceIds: z.array(z.string().trim().min(1).max(64)).max(3).default([]),
  /** A master's id or `any`. */
  specialistId: z.string().trim().min(1).max(64),
  branchId: z.uuid().optional(),
  date: DATE_SCHEMA,
  name: z.string().trim().min(1, 'Укажите имя').max(120),
  phone: z.string().trim().max(32).default(''),
})

const waitlistTokenSchema = z.string().trim().min(16).max(128)

type JoinWaitlistInput = z.infer<typeof joinWaitlistSchema>

export type { JoinWaitlistInput }
export { joinWaitlistSchema, waitlistTokenSchema }
