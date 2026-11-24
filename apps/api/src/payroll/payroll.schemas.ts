import { z } from 'zod'

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
const SUM = z.number().int().min(0).max(10_000_000)

const payRateSchema = z.object({
  serviceId: z.string().trim().min(1).max(64),
  kind: z.enum(['percent', 'fixed']),
  value: SUM,
})

const payScheme = z
  .object({
    percent: z.number().int().min(0).max(100).nullable().default(null),
    rates: z.array(payRateSchema).max(200).default([]),
    salary: z
      .object({ kind: z.enum(['month', 'day']), amount: SUM })
      .nullable()
      .default(null),
    minimum: SUM.nullable().default(null),
    productsPercent: z.number().int().min(0).max(100).nullable().default(null),
  })
  .refine(
    (scheme) =>
      scheme.rates.every((rate) => rate.kind === 'fixed' || rate.value <= 100) &&
      new Set(scheme.rates.map((rate) => rate.serviceId)).size === scheme.rates.length,
    { message: 'Check the service rates' },
  )

const payoutSchema = z
  .object({
    specialistId: z.string().trim().min(1).max(64),
    amount: z.number().int().min(1, 'Enter an amount').max(10_000_000),
    from: DATE,
    to: DATE,
    paidOn: DATE,
    note: z.string().trim().max(200).default(''),
  })
  .refine((payout) => payout.from <= payout.to, { message: 'The period is reversed' })

type PaySchemeInput = z.infer<typeof payScheme>
type PayoutInput = z.infer<typeof payoutSchema>

export type { PaySchemeInput, PayoutInput }
export { payoutSchema, payScheme as paySchemeSchema }
