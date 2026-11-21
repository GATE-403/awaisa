import { createHmac, timingSafeEqual } from 'node:crypto'

type WebhookStatus = {
  id?: string
  status?: string
  recipient_id?: string
  errors?: { code?: number; title?: string; message?: string }[]
}

type WebhookBody = {
  object?: string
  entry?: { changes?: { field?: string; value?: { statuses?: WebhookStatus[] } }[] }[]
}

type FailedDelivery = { messageId: string; recipient: string; reason: string }

/** Meta signs each webhook with the app secret: `X-Hub-Signature-256: sha256=<hex>`. */
const isValidSignature = (rawBody: Buffer, header: string | undefined, appSecret: string) => {
  if (!header?.startsWith('sha256=')) return false
  const expected = Buffer.from(
    createHmac('sha256', appSecret).update(rawBody).digest('hex'),
    'utf8',
  )
  const actual = Buffer.from(header.slice('sha256='.length), 'utf8')
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

/** Messages Meta accepted but could not deliver (not on WhatsApp, blocked, template paused). */
const failedDeliveries = (body: WebhookBody): FailedDelivery[] =>
  (body.entry ?? []).flatMap((entry) =>
    (entry.changes ?? []).flatMap((change) =>
      (change.value?.statuses ?? [])
        .filter((status) => status.status === 'failed')
        .map((status) => {
          const error = status.errors?.[0]
          return {
            messageId: status.id ?? '',
            recipient: status.recipient_id ?? '',
            reason: error
              ? `${error.code ?? ''} ${error.title ?? error.message ?? ''}`.trim()
              : 'unknown',
          }
        }),
    ),
  )

export type { FailedDelivery, WebhookBody }
export { failedDeliveries, isValidSignature }
