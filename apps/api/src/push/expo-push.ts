import type { PushMessage } from '@awaisa/contracts'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts'

// The Expo push service takes at most 100 messages a request.
const EXPO_BATCH_SIZE = 100

// Receipts are asked for at most a thousand tickets a request.
const EXPO_RECEIPT_BATCH_SIZE = 1000

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
  /** The ticket of each message Expo took, whose receipt says later whether Apple or Google delivered it. */
  tickets: { token: string; id: string }[]
  /** What went wrong otherwise, for the log. */
  errors: string[]
}

type ExpoReceiptResult = {
  /** Tickets whose receipt says the device is gone: forget their tokens. */
  gone: string[]
  /** Tickets that have a receipt, whatever it says: no need to ask again. */
  settled: string[]
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
  const result: ExpoSendResult = { gone: [], sent: [], tickets: [], errors: [] }
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
      if (ticket.id) result.tickets.push({ token, id: ticket.id })
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

/**
 * Reads `getReceipts`: `data` maps each ticket id to its receipt. A ticket missing from it has no
 * receipt yet (Expo keeps them a day and makes them in about a quarter of an hour), so it is asked
 * again later. `DeviceNotRegistered` in a receipt is a token Apple or Google dropped after Expo
 * took the message, which the ticket alone could not tell.
 */
const parseExpoReceipts = (response: unknown): ExpoReceiptResult => {
  const result: ExpoReceiptResult = { gone: [], settled: [], errors: [] }
  if (!isRecord(response)) {
    result.errors.push('Expo receipts: unreadable answer')
    return result
  }
  if (Array.isArray(response.errors) && response.errors.length > 0) {
    for (const error of response.errors) {
      const code = isRecord(error) ? String(error.code ?? '') : ''
      const text = isRecord(error) ? String(error.message ?? '') : ''
      result.errors.push(`Expo receipts: ${code} ${text}`.trim())
    }
    return result
  }
  const receipts = isRecord(response.data) ? response.data : {}
  for (const [id, receipt] of Object.entries(receipts)) {
    if (!isRecord(receipt)) continue
    result.settled.push(id)
    if (receipt.status === 'ok') continue
    const details = isRecord(receipt.details) ? receipt.details : {}
    if (details.error === 'DeviceNotRegistered') {
      result.gone.push(id)
      continue
    }
    result.errors.push(`Expo receipt ${id}: ${String(receipt.message ?? details.error ?? 'error')}`)
  }

  return result
}

const chunk = <T>(items: T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, index * size + size),
  )

export type { ExpoMessage, ExpoReceiptResult, ExpoSendResult }
export {
  chunk,
  EXPO_BATCH_SIZE,
  EXPO_CHANNEL_ID,
  EXPO_PUSH_URL,
  EXPO_RECEIPT_BATCH_SIZE,
  EXPO_RECEIPTS_URL,
  isExpoPushToken,
  parseExpoReceipts,
  parseExpoResponse,
  toExpoMessage,
}
