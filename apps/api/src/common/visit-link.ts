import { createHmac, timingSafeEqual } from 'node:crypto'

const SIGNATURE_LENGTH = 22
// Signed links travel as a booking token with this prefix, so every token-based endpoint
// (view, cancel, restore, move) accepts them and the web stores them like any token.
const SIGNED_TOKEN_PREFIX = 'sig.'

const visitSignature = (bookingId: string, secret: string) =>
  createHmac('sha256', secret)
    .update(`visit:${bookingId}`)
    .digest('base64url')
    .slice(0, SIGNATURE_LENGTH)

/** The link in SMS: opens the visit without signing in and keeps it on the phone. */
const visitLink = (webUrl: string, bookingId: string, secret: string) =>
  `${webUrl}/v/${bookingId}?s=${visitSignature(bookingId, secret)}`

const isSignedToken = (bookingId: string, token: string, secret: string) => {
  if (!token.startsWith(SIGNED_TOKEN_PREFIX)) return false
  const expected = Buffer.from(visitSignature(bookingId, secret))
  const actual = Buffer.from(token.slice(SIGNED_TOKEN_PREFIX.length))
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export { isSignedToken, SIGNED_TOKEN_PREFIX, visitLink, visitSignature }
