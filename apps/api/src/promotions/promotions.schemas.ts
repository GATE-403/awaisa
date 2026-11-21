import { z } from 'zod'

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const MINUTES = z.number().int().min(0).max(1440)

const promotionSchema = z
  .object({
    title: z.string().trim().min(1, 'Назовите акцию').max(80),
    kind: z.enum(['happy_hours', 'first_visit', 'promo_code']),
    percent: z.number().int().min(1, 'Скидка от 1%').max(90, 'Скидка до 90%'),
    code: z
      .string()
      .trim()
      .max(40)
      .regex(/^[A-Za-z0-9А-Яа-яЁё_-]*$/, 'Только буквы, цифры, - и _')
      .nullable()
      .default(null),
    weekdays: z.array(z.number().int().min(0).max(6)).max(7).nullable().default(null),
    fromMinutes: MINUTES.nullable().default(null),
    toMinutes: MINUTES.nullable().default(null),
    serviceIds: z.array(z.string().trim().min(1).max(64)).max(200).nullable().default(null),
    startsOn: DATE.nullable().default(null),
    endsOn: DATE.nullable().default(null),
    isActive: z.boolean().default(true),
  })
  .refine((value) => value.kind !== 'promo_code' || Boolean(value.code), {
    message: 'Укажите промокод',
    path: ['code'],
  })
  .refine(
    (value) =>
      value.fromMinutes === null || value.toMinutes === null || value.toMinutes > value.fromMinutes,
    { message: 'Конец позже начала', path: ['toMinutes'] },
  )

const quoteQuerySchema = z.object({
  serviceId: z.string().trim().min(1).max(64),
  // Services done after the first in the same visit, comma-separated.
  extraServiceIds: z
    .string()
    .optional()
    .transform((value) =>
      (value ?? '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().max(64)).max(3)),
  date: DATE,
  time: z.string().regex(/^\d{2}:\d{2}$/),
  code: z.string().trim().max(40).optional(),
  phone: z.string().trim().max(32).optional(),
})

type PromotionInput = z.infer<typeof promotionSchema>
type QuoteQuery = z.output<typeof quoteQuerySchema>

export type { PromotionInput, QuoteQuery }
export { promotionSchema, quoteQuerySchema }
