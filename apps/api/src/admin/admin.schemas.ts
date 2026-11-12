import { z } from 'zod'
import { createBookingSchema } from '../bookings/bookings.schemas.js'

const DATE_SCHEMA = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате YYYY-MM-DD')

const TIME_SCHEMA = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$|^24:00$/, 'Время должно быть в формате HH:MM')

const scheduleQuerySchema = z.object({ date: DATE_SCHEMA })

const createTimeOffSchema = z
  .object({
    specialistId: z.string().trim().min(1).max(64),
    date: DATE_SCHEMA,
    from: TIME_SCHEMA,
    to: TIME_SCHEMA,
    reason: z.string().trim().max(160).default(''),
  })
  .refine((value) => value.from < value.to, {
    message: 'Конец должен быть позже начала',
    path: ['to'],
  })

// A booking made by staff for a client: the phone is the client's, so it is required.
const staffBookingSchema = createBookingSchema.extend({
  phone: z.string().trim().min(1, 'Укажите телефон клиента').max(32),
})

const moveBookingSchema = z.object({
  date: DATE_SCHEMA,
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Время должно быть в формате HH:MM'),
  specialistId: z.string().trim().min(1).max(64),
})

type MoveBookingInput = z.infer<typeof moveBookingSchema>

const outcomeSchema = z.object({
  outcome: z.enum(['arrived', 'no_show']).nullable(),
  paidAmount: z.number().int().min(0).max(10_000_000).nullable().optional(),
  paymentMethod: z
    .enum(['cash', 'card', 'transfer', 'subscription', 'certificate'])
    .nullable()
    .optional(),
  // Loyalty drawn on for an «arrived» visit: each is used at most once per visit.
  subscriptionId: z.uuid().nullable().optional(),
  certificateCode: z.string().trim().max(12).nullable().optional(),
  certificateAmount: z.number().int().min(1).max(10_000_000).nullable().optional(),
  bonusAmount: z.number().int().min(1).max(10_000_000).nullable().optional(),
})

type OutcomeBody = z.infer<typeof outcomeSchema>

const closeDaySchema = z.object({ date: DATE_SCHEMA })

const reopenSchema = z.object({ ids: z.array(z.uuid()).min(1).max(200) })

type CloseDayInput = z.infer<typeof closeDaySchema>
type ReopenInput = z.infer<typeof reopenSchema>

const analyticsQuerySchema = z.object({
  days: z.coerce
    .number()
    .int()
    .refine((value) => [7, 30, 90, 365].includes(value), 'Период: 7, 30, 90 или 365 дней')
    .default(30),
})

type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>

const recentBookingsQuerySchema = z.object({ since: z.iso.datetime({ offset: true }) })

type RecentBookingsQuery = z.infer<typeof recentBookingsQuerySchema>

type StaffBookingInput = z.infer<typeof staffBookingSchema>

type ScheduleQuery = z.infer<typeof scheduleQuerySchema>

type CreateTimeOffInput = z.infer<typeof createTimeOffSchema>

export type {
  AnalyticsQuery,
  CloseDayInput,
  ReopenInput,
  OutcomeBody,
  CreateTimeOffInput,
  MoveBookingInput,
  RecentBookingsQuery,
  ScheduleQuery,
  StaffBookingInput,
}
export {
  analyticsQuerySchema,
  closeDaySchema,
  reopenSchema,
  outcomeSchema,
  createTimeOffSchema,
  moveBookingSchema,
  recentBookingsQuerySchema,
  scheduleQuerySchema,
  staffBookingSchema,
}
