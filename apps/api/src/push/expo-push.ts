import type { PushMessage } from '@awaisa/contracts'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

// The Expo push service takes at most 100 messages a request.
const EXPO_BATCH_SIZE = 100

// The app creates this Android channel before asking for a token (`apps/mobile`, `pushNotifications.ts`).
const EXPO_CHANNEL_ID = 'bookings'

// `ExponentPushToken[…]` (older apps: `ExpoPushToken[…]`): the only thing Expo accepts in `to`.
const EXPO_TOKEN = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{8,128}\]$/

const isExpoPushToken = (value: string) => EXPO_TOKEN.test(value)

type ExpoMessage = {
  to: string
  title: string
  body: string
  data: { url: string }
  sound: 'default'
  priority: 'high'
  ttl: number
  channelId: string
  // One booking never shows twice: `tag` replaces it on Android, `collapseId` on iOS.
  tag: string
  collapseId: string
}

type ExpoTicket =
  | { status: 'ok'; id: string }
  | { status: 'error'; message?: string; details?: { error?: string } }

type ExpoSendResult = {
  /** Tokens Expo no longer knows (the app was removed or its pushes turned off): forget them. */
  gone: string[]
  /** Tokens the message reached Expo for. */
  sent: string[]
  /** What went wrong otherwise, for the log. */
  errors: string[]
}

const toExpoMessage = (token: string, message: PushMessage, ttlSeconds: number): ExpoMessage => ({
  to: token,
  title: message.title,
  body: message.body,
  data: { url: message.url },
  sound: 'default',
  priority: 'high',
  ttl: ttlSeconds,
  channelId: EXPO_CHANNEL_ID,
  tag: message.tag,
  collapseId: message.tag,
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/**
 * Reads the push service's answer to one batch. Tickets come back in the order of the messages;
 * `DeviceNotRegistered` means the token is dead. A request-level `errors` list (bad access token,
 * too many requests) fails the whole batch, so nothing is forgotten for it.
 */
const parseExpoResponse = (tokens: string[], response: unknown): ExpoSendResult => {
  const result: ExpoSendResult = { gone: [], sent: [], errors: [] }
  if (!isRecord(response)) {
    result.errors.push('Expo push: unreadable answer')
    return result
  }
  if (Array.isArray(response.errors) && response.errors.length > 0) {
    for (const error of response.errors) {
      const code = isRecord(error) ? String(error.code ?? '') : ''
      const text = isRecord(error) ? String(error.message ?? '') : ''
      result.errors.push(`Expo push: ${code} ${text}`.trim())
    }
    return result
  }
  const tickets = Array.isArray(response.data) ? (response.data as ExpoTicket[]) : []
  tokens.forEach((token, index) => {
    const ticket = tickets[index]
    if (ticket?.status === 'ok') {
      result.sent.push(token)
      return
    }
    if (ticket?.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
      result.gone.push(token)
      return
    }
    result.errors.push(
      `Expo push to ${token}: ${ticket?.status === 'error' ? ticket.message : 'no ticket'}`,
    )
  })

  return result
}

const chunk = <T>(items: T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, index * size + size),
  )

export type { ExpoMessage, ExpoSendResult }
export {
  chunk,
  EXPO_BATCH_SIZE,
  EXPO_CHANNEL_ID,
  EXPO_PUSH_URL,
  isExpoPushToken,
  parseExpoResponse,
  toExpoMessage,
}
