import { z } from 'zod'
import { BUSINESS_KINDS, SLOT_STEPS } from './business-rules.js'

const optionalText = (max: number) => z.string().trim().max(max).default('')

const kindSchema = z.enum(BUSINESS_KINDS as [string, ...string[]])

const createBusinessSchema = z.object({
  name: z.string().trim().min(2, 'Укажите название').max(120),
  slug: z.string().trim().toLowerCase().min(3).max(48),
  kind: kindSchema.default('beauty'),
  city: z.string().trim().min(1).max(80).default('Бишкек'),
  address: optionalText(200),
  phone: optionalText(32),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  // Services picked from the kind's starter template during registration.
  services: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(160),
        durationMinutes: z
          .number()
          .int()
          .min(5)
          .max(12 * 60),
        price: z.number().int().min(0).max(10_000_000),
        isPopular: z.boolean().default(false),
      }),
    )
    .max(20)
    .default([]),
})

const updateBusinessSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  kind: kindSchema.optional(),
  description: z.string().trim().max(1000).optional(),
  city: z.string().trim().min(1).max(80).optional(),
  address: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(32).optional(),
  whatsapp: z.string().trim().max(32).optional(),
  mapUrl: z
    .string()
    .trim()
    .max(500)
    .refine(
      (value) => value === '' || /^https:\/\//.test(value),
      'Ссылка должна начинаться с https://',
    )
    .optional(),
  slotMinutes: z
    .number()
    .int()
    .refine(
      (value) => (SLOT_STEPS as readonly number[]).includes(value),
      'Шаг: 15, 30 или 60 минут',
    )
    .optional(),
  isPublished: z.boolean().optional(),
})

const hoursSchema = z
  .array(
    z
      .object({
        weekday: z.number().int().min(0).max(6),
        opensMinutes: z.number().int().min(0).max(1440),
        closesMinutes: z.number().int().min(0).max(1440),
      })
      .refine((day) => day.closesMinutes > day.opensMinutes, 'Закрытие должно быть позже открытия'),
  )
  .max(7)
  .refine(
    (days) => new Set(days.map((day) => day.weekday)).size === days.length,
    'Каждый день недели — один раз',
  )

const catalogQuerySchema = z.object({
  kind: kindSchema.optional(),
  q: z.string().trim().max(80).optional(),
})

const slugQuerySchema = z.object({ slug: z.string().trim().toLowerCase().max(64) })

const categorySchema = z.object({ name: z.string().trim().min(1, 'Укажите название').max(120) })

const serviceSchema = z.object({
  categoryId: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1, 'Укажите название').max(160),
  description: optionalText(500),
  durationMinutes: z
    .number()
    .int()
    .min(5)
    .max(12 * 60),
  price: z.number().int().min(0).max(10_000_000),
  isPopular: z.boolean().default(false),
  isActive: z.boolean().default(true),
})

const specialistSchema = z.object({
  name: z.string().trim().min(1, 'Укажите имя').max(160),
  role: optionalText(120),
  serviceIds: z.array(z.string().trim().min(1).max(64)).max(200).default([]),
  isActive: z.boolean().default(true),
  // null = the master works at every branch.
  branchId: z.uuid().nullable().default(null),
  // The master's own number for «Мой день»; empty = no access.
  phone: z.string().trim().max(32).default(''),
})

const branchSchema = z.object({
  name: z.string().trim().min(1, 'Укажите название').max(120),
  address: z.string().trim().max(200).default(''),
  phone: z.string().trim().max(32).default(''),
  latitude: z.number().min(-90).max(90).nullable().default(null),
  longitude: z.number().min(-180).max(180).nullable().default(null),
  isActive: z.boolean().default(true),
})

const mapQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  kind: z.string().trim().max(32).optional(),
  q: z.string().trim().max(80).optional(),
})

type CreateBusinessInput = z.infer<typeof createBusinessSchema>
type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>
type HoursInput = z.infer<typeof hoursSchema>

const masterHoursSchema = z.object({
  hasOwnHours: z.boolean(),
  days: hoursSchema,
})

const LEAVE_DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата в формате YYYY-MM-DD')

const leaveSchema = z
  .object({
    startsOn: LEAVE_DATE,
    endsOn: LEAVE_DATE,
    reason: z.string().trim().max(160).default(''),
  })
  .refine((leave) => leave.endsOn >= leave.startsOn, 'Конец отпуска раньше начала')

type MasterHoursInput = z.infer<typeof masterHoursSchema>
type LeaveBody = z.infer<typeof leaveSchema>
type CatalogQuery = z.infer<typeof catalogQuerySchema>
type SlugQuery = z.infer<typeof slugQuerySchema>
type CategoryInput = z.infer<typeof categorySchema>
type ServiceInput = z.infer<typeof serviceSchema>
type SpecialistInput = z.infer<typeof specialistSchema>
type BranchInput = z.infer<typeof branchSchema>
type MapQuery = z.infer<typeof mapQuerySchema>

export type {
  BranchInput,
  LeaveBody,
  MasterHoursInput,
  CatalogQuery,
  MapQuery,
  CategoryInput,
  CreateBusinessInput,
  HoursInput,
  ServiceInput,
  SlugQuery,
  SpecialistInput,
  UpdateBusinessInput,
}
export {
  branchSchema,
  mapQuerySchema,
  catalogQuerySchema,
  categorySchema,
  createBusinessSchema,
  hoursSchema,
  leaveSchema,
  masterHoursSchema,
  serviceSchema,
  slugQuerySchema,
  specialistSchema,
  updateBusinessSchema,
}
