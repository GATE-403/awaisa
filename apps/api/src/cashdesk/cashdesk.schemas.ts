import { z } from 'zod'

const MONEY = z.number().min(0).max(100_000_000)
const POSITIVE_MONEY = z.number().gt(0).max(100_000_000)
const METHOD = z.enum(['cash', 'card', 'transfer'])
const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')

const openShiftSchema = z.object({ branchId: z.uuid(), openingCash: MONEY })

const cashMovementSchema = z.object({
  kind: z.enum(['in', 'out']),
  amount: POSITIVE_MONEY,
  reason: z.string().trim().min(1, 'Enter a reason').max(160),
})

const closeShiftSchema = z.object({
  countedCash: MONEY,
  note: z.string().trim().max(240).nullish(),
})

const saleSchema = z.object({
  bookingId: z.uuid().nullish(),
  branchId: z.uuid().nullish(),
  customerPhone: z.string().trim().max(32).nullish(),
  customerName: z.string().trim().max(120).nullish(),
  sellerId: z.string().trim().min(1).max(64).nullish(),
  paymentMethod: METHOD,
  items: z
    .array(z.object({ itemId: z.uuid(), quantity: z.number().gt(0).max(10_000) }))
    .min(1, 'Add a product')
    .max(50),
})

const salesQuerySchema = z.object({ bookingId: z.uuid().optional() })

const expenseSchema = z.object({
  category: z.string().trim().min(1, 'Choose a category').max(40),
  amount: POSITIVE_MONEY,
  date: DATE,
  branchId: z.uuid().nullable().default(null),
  note: z.string().trim().max(240).nullable().default(null),
})

const periodQuerySchema = z.object({
  days: z.coerce
    .number()
    .int()
    .refine((value) => [7, 30, 90, 365].includes(value), 'Period: 7, 30, 90 or 365 days')
    .default(30),
})

type OpenShiftBody = z.infer<typeof openShiftSchema>
type CashMovementBody = z.infer<typeof cashMovementSchema>
type CloseShiftBody = z.infer<typeof closeShiftSchema>
type SaleBody = z.infer<typeof saleSchema>
type SalesQuery = z.infer<typeof salesQuerySchema>
type ExpenseBody = z.infer<typeof expenseSchema>
type PeriodQuery = z.infer<typeof periodQuerySchema>

export type {
  CashMovementBody,
  CloseShiftBody,
  ExpenseBody,
  OpenShiftBody,
  PeriodQuery,
  SaleBody,
  SalesQuery,
}
export {
  cashMovementSchema,
  closeShiftSchema,
  expenseSchema,
  openShiftSchema,
  periodQuerySchema,
  saleSchema,
  salesQuerySchema,
}
