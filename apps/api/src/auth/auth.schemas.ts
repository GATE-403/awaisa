import { z } from 'zod'

const PHONE_SCHEMA = z.string().trim().min(1, 'Укажите номер телефона').max(32)

const requestCodeSchema = z.object({
  phone: PHONE_SCHEMA,
  channel: z.enum(['auto', 'sms']).default('auto'),
})

const verifyCodeSchema = z.object({
  phone: PHONE_SCHEMA,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Код состоит из 6 цифр'),
})

type RequestCodeInput = z.infer<typeof requestCodeSchema>

type VerifyCodeInput = z.infer<typeof verifyCodeSchema>

export type { RequestCodeInput, VerifyCodeInput }
export { requestCodeSchema, verifyCodeSchema }
