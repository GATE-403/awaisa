import { z } from 'zod'

const PHONE_SCHEMA = z.string().trim().min(1, 'Enter a phone number').max(32)

const requestCodeSchema = z.object({
  phone: PHONE_SCHEMA,
})

const verifyCodeSchema = z.object({
  phone: PHONE_SCHEMA,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'The code is 6 digits'),
})

// The page's random sign-in token for the bot (checked again by `isLoginToken`).
const telegramLoginSchema = z.object({
  token: z.string().trim().min(32).max(58),
})

type RequestCodeInput = z.infer<typeof requestCodeSchema>

type VerifyCodeInput = z.infer<typeof verifyCodeSchema>

type TelegramLoginInput = z.infer<typeof telegramLoginSchema>

export type { RequestCodeInput, TelegramLoginInput, VerifyCodeInput }
export { requestCodeSchema, telegramLoginSchema, verifyCodeSchema }
