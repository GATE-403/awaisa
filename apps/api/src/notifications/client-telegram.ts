import { createHmac, timingSafeEqual } from 'node:crypto'

// A client links Telegram from their booking: `t.me/<bot>?start=<param>`. The parameter is the
// booking id signed with AUTH_SECRET - no table of codes, and it only reveals a booking id.
// Telegram allows 64 characters of [A-Za-z0-9_-]: «v» + 32 hex + 16 signature = 49.
const PREFIX = 'v'
const SIGNATURE_LENGTH = 16

const sign = (hex: string, secret: string) =>
  createHmac('sha256', secret)
    .update(`tg-client:${hex}`)
    .digest('base64url')
    .slice(0, SIGNATURE_LENGTH)

const clientStartParam = (bookingId: string, secret: string) => {
  const hex = bookingId.replace(/-/g, '').toLowerCase()
  return `${PREFIX}${hex}${sign(hex, secret)}`
}

/** The booking id a start parameter carries, or null when it is not ours or was tampered with. */
const readClientStartParam = (param: string, secret: string) => {
  const match = /^v([0-9a-f]{32})([A-Za-z0-9_-]{16})$/.exec(param)
  if (!match) return null
  const [, hex = '', signature = ''] = match
  const expected = Buffer.from(sign(hex, secret))
  const actual = Buffer.from(signature)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export { clientStartParam, readClientStartParam }
