import { z } from 'zod'
import { INN_PATTERN } from './receipt.js'

const RATE = (max: number) => z.number().min(0).max(max)

const fiscalSettingsSchema = z
  .object({
    isEnabled: z.boolean(),
    inn: z.preprocess(
      (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
      z.string().trim().regex(INN_PATTERN, 'TIN: 14 digits').nullish(),
    ),
    taxRegime: z.enum(['general', 'single', 'patent']),
    isVatPayer: z.boolean(),
    vatRate: RATE(30),
    salesTaxServices: RATE(10),
    salesTaxGoods: RATE(10),
    login: z.string().trim().max(120).nullish(),
    password: z.string().max(200).nullish(),
  })
  .refine((value) => !value.isEnabled || Boolean(value.inn), {
    message: 'Enter your TIN to issue receipts',
    path: ['inn'],
  })

// A visit's receipts, or every receipt the provider kept refusing («Failed»).
const receiptsQuerySchema = z
  .object({ bookingId: z.uuid().optional(), status: z.literal('failed').optional() })
  .refine((query) => Boolean(query.bookingId) !== Boolean(query.status), {
    message: 'Give a booking or status=failed',
  })

type FiscalSettingsBody = z.infer<typeof fiscalSettingsSchema>
type ReceiptsQuery = z.infer<typeof receiptsQuerySchema>

export type { FiscalSettingsBody, ReceiptsQuery }
export { fiscalSettingsSchema, receiptsQuerySchema }
