import { z } from 'zod'

const AMOUNT = z.number().min(0).max(1_000_000)

const stockItemSchema = z.object({
  name: z.string().trim().min(1, 'Name the item').max(120),
  unit: z.string().trim().min(1).max(12),
  unitCost: AMOUNT,
  minQuantity: AMOUNT.nullable().default(null),
  /** What one visit of each service uses (amount 0 = not used). */
  materials: z
    .array(z.object({ serviceId: z.string().trim().min(1).max(64), amount: AMOUNT }))
    .max(200)
    .default([]),
  /** Sold to clients at the counter as well. */
  isForSale: z.boolean().default(false),
  salePrice: AMOUNT.nullable().default(null),
})

const receiveSchema = z.object({
  quantity: z.number().gt(0).max(1_000_000),
  // A new delivery may change the price per unit.
  unitCost: AMOUNT.optional(),
  // Also record what the delivery cost as an expense ('Materials').
  expense: z.object({ branchId: z.uuid().nullable() }).nullish(),
})

const adjustSchema = z.object({ quantity: AMOUNT })

type StockItemInput = z.infer<typeof stockItemSchema>
type ReceiveInput = z.infer<typeof receiveSchema>
type AdjustInput = z.infer<typeof adjustSchema>

export type { AdjustInput, ReceiveInput, StockItemInput }
export { adjustSchema, receiveSchema, stockItemSchema }
