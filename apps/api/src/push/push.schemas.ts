import { z } from 'zod'

// Push services are https only; the keys are base64url, short and fixed in length.
const ENDPOINT_SCHEMA = z.url({ protocol: /^https$/ }).max(2048)

const BASE64URL = /^[A-Za-z0-9_-]+=*$/

const subscribeSchema = z.object({
  endpoint: ENDPOINT_SCHEMA,
  keys: z.object({
    p256dh: z.string().regex(BASE64URL).max(128),
    auth: z.string().regex(BASE64URL).max(64),
  }),
})

const unsubscribeSchema = z.object({ endpoint: ENDPOINT_SCHEMA })

type SubscribeInput = z.infer<typeof subscribeSchema>

type UnsubscribeInput = z.infer<typeof unsubscribeSchema>

export type { SubscribeInput, UnsubscribeInput }
export { subscribeSchema, unsubscribeSchema }
