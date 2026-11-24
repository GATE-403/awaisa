import type { BookingChannel } from '@awaisa/contracts'
import { z } from 'zod'
import { MAX_EXTRA_SERVICES } from './booking-rules.js'

const ID_SCHEMA = z.string().trim().min(1).max(64)

const DATE_SCHEMA = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')

const TIME_SCHEMA = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:MM')

const availabilityQuerySchema = z.object({
  serviceId: ID_SCHEMA,
  specialistId: ID_SCHEMA,
  date: DATE_SCHEMA,
  // With «any master», only masters of this branch (or of every branch) are considered.
  branchId: z.uuid().optional(),
  // Services done after `serviceId` in the same visit, comma-separated.
  extraServiceIds: z
    .string()
    .optional()
    .transform((value) =>
      (value ?? '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    )
    .pipe(z.array(ID_SCHEMA).max(MAX_EXTRA_SERVICES)),
})

const BOOKING_CHANNELS = [
  'catalog',
  'for_you',
  'feed',
  'search',
  'map',
  'salon_link',
  'other',
] as const satisfies readonly BookingChannel[]

const createBookingSchema = z.object({
  serviceId: ID_SCHEMA,
  /** Services done after `serviceId` in the same visit, by the same master, in this order. */
  extraServiceIds: z.array(ID_SCHEMA).max(MAX_EXTRA_SERVICES).default([]),
  specialistId: ID_SCHEMA,
  date: DATE_SCHEMA,
  time: TIME_SCHEMA,
  name: z.string().trim().min(1, 'Enter a name').max(120),
  // Signed-in clients book with their verified number, so the field may be empty; the service checks it.
  phone: z.string().trim().max(32).default(''),
  /** A signed-in client booking someone else (mum, a child): their own name and number, the
      booking still listed in the account. */
  forOther: z.boolean().default(false),
  comment: z.string().trim().max(500).default(''),
  branchId: z.uuid().optional(),
  // What the client wants to receive: a confirmation SMS, and a reminder 1 h, 2 h or a day before.
  smsConfirmation: z.boolean().default(true),
  reminderMinutes: z
    .union([z.literal(60), z.literal(120), z.literal(1440)])
    .nullable()
    .default(120),
  promoCode: z.string().trim().max(40).optional(),
  /** Who invited this client (a profile handle or public id from a `?ref=` link). */
  ref: z.string().trim().max(40).optional(),
  /** Paid by the signed-in client's subscription at this place. */
  subscriptionId: z.uuid().optional(),
  /** 'Buy a pass and book': an online plan bought with this booking. */
  subscriptionPlanId: z.uuid().optional(),
  channel: z.enum(BOOKING_CHANNELS).optional(),
  lookPhotoId: z.uuid().optional(),
})

const nextFreeQuerySchema = z.object({
  slugs: z
    .string()
    .transform((value) => [...new Set(value.split(',').map((slug) => slug.trim()))].filter(Boolean))
    .pipe(z.array(z.string().max(64)).min(1).max(60)),
})

const moveBookingSchema = z.object({ date: DATE_SCHEMA, time: TIME_SCHEMA })

// The booking form's service list: each service's first free time today or tomorrow.
const servicesNextFreeQuerySchema = z.object({
  branchId: z.string().trim().min(1).max(64).optional(),
})

type ServicesNextFreeQuery = z.infer<typeof servicesNextFreeQuerySchema>
type MoveByClientInput = z.infer<typeof moveBookingSchema>

const bookingTokenSchema = z.string().trim().min(16).max(128)

type AvailabilityQuery = z.output<typeof availabilityQuerySchema>

type CreateBookingInput = z.infer<typeof createBookingSchema>

type NextFreeQuery = z.output<typeof nextFreeQuerySchema>

export type {
  AvailabilityQuery,
  CreateBookingInput,
  MoveByClientInput,
  NextFreeQuery,
  ServicesNextFreeQuery,
}
export {
  availabilityQuerySchema,
  bookingTokenSchema,
  createBookingSchema,
  moveBookingSchema,
  nextFreeQuerySchema,
  servicesNextFreeQuerySchema,
}
