import { z } from 'zod'

const certificateSaleSchema = z.object({
  isOnline: z.boolean(),
  amounts: z.array(z.number().int().min(100, 'At least 100 som').max(1_000_000)).max(6),
})

const certificateOrderSchema = z.object({
  amount: z.number().int().min(100).max(1_000_000),
  buyerName: z.string().trim().min(1, 'What is your name?').max(80),
  buyerPhone: z.string().trim().max(32).default(''),
  recipientName: z.string().trim().max(80).default(''),
  recipientPhone: z.string().trim().max(32).default(''),
  message: z.string().trim().max(300).default(''),
})

type CertificateSaleInput = z.infer<typeof certificateSaleSchema>
type CertificateOrderBody = z.infer<typeof certificateOrderSchema>

export type { CertificateOrderBody, CertificateSaleInput }
export { certificateOrderSchema, certificateSaleSchema }
