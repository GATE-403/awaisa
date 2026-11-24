import { z } from 'zod'

const segment = z.enum(['lapsed', 'birthday', 'all'])

const previewQuerySchema = z.object({
  segment,
  days: z.coerce.number().int().min(14).max(365).default(60),
})

const sendMailingSchema = z.object({
  segment,
  days: z.number().int().min(14).max(365).default(60),
  text: z.string().trim().min(10, 'Too short').max(400, '400 characters at most'),
})

const birthdayGreetingSchema = z.object({
  // null turns the automatic greeting off.
  text: z.string().trim().min(10).max(300).nullable(),
})

type PreviewQuery = z.infer<typeof previewQuerySchema>
type SendMailingInput = z.infer<typeof sendMailingSchema>
type BirthdayGreetingInput = z.infer<typeof birthdayGreetingSchema>

export type { BirthdayGreetingInput, PreviewQuery, SendMailingInput }
export { birthdayGreetingSchema, previewQuerySchema, sendMailingSchema }
