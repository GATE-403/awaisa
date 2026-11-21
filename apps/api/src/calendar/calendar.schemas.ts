import { z } from 'zod'

const feedSchema = z.object({ specialistId: z.string().min(1).max(64).nullable().default(null) })

const phonesSchema = z.object({ isShown: z.boolean() })

type FeedInput = z.infer<typeof feedSchema>

type PhonesInput = z.infer<typeof phonesSchema>

export type { FeedInput, PhonesInput }
export { feedSchema, phonesSchema }
