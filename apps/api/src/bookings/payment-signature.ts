import { createHmac, timingSafeEqual } from 'node:crypto'

const SIGNATURE_LENGTH = 22

// The checkout link carries its own signature, so the pay page opens without signing in and
// nobody can complete or read someone else's payment by guessing ids.
const paymentSignature = (paymentId: string, secret: string) =>
  createHmac('sha256', secret)
    .update(`pay:${paymentId}`)
    .digest('base64url')
    .slice(0, SIGNATURE_LENGTH)

const isPaymentSignature = (paymentId: string, signature: string, secret: string) => {
  const expected = Buffer.from(paymentSignature(paymentId, secret))
  const actual = Buffer.from(signature)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export { isPaymentSignature, paymentSignature }
