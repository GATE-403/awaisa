import { createHmac, timingSafeEqual } from 'node:crypto'

const SIGNATURE_LENGTH = 22

// The client's link to their receipt carries its own signature, like a visit or a pay link, so
// it opens without signing in and receipts cannot be read by guessing ids.
const receiptSignature = (receiptId: string, secret: string) =>
  createHmac('sha256', secret)
    .update(`receipt:${receiptId}`)
    .digest('base64url')
    .slice(0, SIGNATURE_LENGTH)

const isReceiptSignature = (receiptId: string, signature: string, secret: string) => {
  const expected = Buffer.from(receiptSignature(receiptId, secret))
  const actual = Buffer.from(signature)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export { isReceiptSignature, receiptSignature }
