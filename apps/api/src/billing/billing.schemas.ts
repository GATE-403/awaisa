import { z } from 'zod'

const checkoutSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('plan'),
    planKey: z.string().trim().min(1).max(32),
    months: z.number().int().min(1).max(12),
  }),
  z.object({ kind: z.literal('sms'), packKey: z.string().trim().min(1).max(32) }),
])

const extendSchema = z
  .object({
    planKey: z.string().trim().min(1).max(32),
    months: z.number().int().min(1).max(36).optional(),
    isLifetime: z.boolean().optional(),
  })
  .refine((body) => body.isLifetime || body.months, { message: 'Choose a period' })

type CheckoutInput = z.infer<typeof checkoutSchema>
type ExtendInput = z.infer<typeof extendSchema>

export { type CheckoutInput, checkoutSchema, type ExtendInput, extendSchema }
