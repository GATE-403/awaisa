import { z } from 'zod'

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const loyaltySettingsSchema = z.object({
  // Share of what the client paid that comes back as bonuses; null = bonuses off.
  bonusPercent: z.number().int().min(1).max(30).nullable(),
})

const planSchema = z.object({
  title: z.string().trim().min(1, 'Name the pass').max(80),
  serviceId: z.string().trim().min(1).max(64).nullable().default(null),
  visits: z.number().int().min(1).max(100),
  price: z.number().int().min(0).max(10_000_000),
  validDays: z.number().int().min(1).max(730),
  isActive: z.boolean().default(true),
  isOnline: z.boolean().default(false),
})

const certificateSchema = z.object({
  amount: z.number().int().min(100, 'From 100 som').max(1_000_000),
  recipient: z.string().trim().max(120).default(''),
  phone: z.string().trim().max(32).default(''),
  expiresOn: DATE.nullable().default(null),
})

const sellSubscriptionSchema = z.object({ planId: z.uuid() })

type LoyaltySettingsInput = z.infer<typeof loyaltySettingsSchema>
type PlanInput = z.infer<typeof planSchema>
type CertificateInput = z.infer<typeof certificateSchema>
type SellSubscriptionInput = z.infer<typeof sellSubscriptionSchema>

export type { CertificateInput, LoyaltySettingsInput, PlanInput, SellSubscriptionInput }
export { certificateSchema, loyaltySettingsSchema, planSchema, sellSubscriptionSchema }
