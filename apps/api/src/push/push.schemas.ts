import { z } from 'zod'
import { isExpoPushToken } from './expo-push.js'

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

const tokenSchema = z.object({
  token: z.string().max(160).refine(isExpoPushToken, 'This is not an Expo token'),
})

type SubscribeInput = z.infer<typeof subscribeSchema>

type UnsubscribeInput = z.infer<typeof unsubscribeSchema>

type TokenInput = z.infer<typeof tokenSchema>

export type { SubscribeInput, TokenInput, UnsubscribeInput }
export { subscribeSchema, tokenSchema, unsubscribeSchema }
