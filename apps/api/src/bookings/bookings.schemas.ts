import { z } from 'zod'

const ID_SCHEMA = z.string().trim().min(1).max(64)

const DATE_SCHEMA = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате YYYY-MM-DD')

const TIME_SCHEMA = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Время должно быть в формате HH:MM')

const availabilityQuerySchema = z.object({
  serviceId: ID_SCHEMA,
  specialistId: ID_SCHEMA,
  date: DATE_SCHEMA,
  // With «any master», only masters of this branch (or of every branch) are considered.
  branchId: z.uuid().optional(),
})

const createBookingSchema = z.object({
  serviceId: ID_SCHEMA,
  specialistId: ID_SCHEMA,
  date: DATE_SCHEMA,
  time: TIME_SCHEMA,
  name: z.string().trim().min(1, 'Укажите имя').max(120),
  // Signed-in clients book with their verified number, so the field may be empty; the service checks it.
  phone: z.string().trim().max(32).default(''),
  comment: z.string().trim().max(500).default(''),
  branchId: z.uuid().optional(),
  // What the client wants to receive: a confirmation SMS, and a reminder 1 h, 2 h or a day before.
  smsConfirmation: z.boolean().default(true),
  reminderMinutes: z
    .union([z.literal(60), z.literal(120), z.literal(1440)])
    .nullable()
    .default(120),
})

const nextFreeQuerySchema = z.object({
  slugs: z
    .string()
    .transform((value) => [...new Set(value.split(',').map((slug) => slug.trim()))].filter(Boolean))
    .pipe(z.array(z.string().max(64)).min(1).max(60)),
})

const bookingTokenSchema = z.string().trim().min(16).max(128)

type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>

type CreateBookingInput = z.infer<typeof createBookingSchema>

type NextFreeQuery = z.output<typeof nextFreeQuerySchema>

export type { AvailabilityQuery, CreateBookingInput, NextFreeQuery }
export { availabilityQuerySchema, bookingTokenSchema, createBookingSchema, nextFreeQuerySchema }
