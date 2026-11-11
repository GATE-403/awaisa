import { isPaymentSignature, paymentSignature } from './payment-signature.js'

const SECRET = 'test-secret-that-is-long-enough-000000'

describe('payment signature', () => {
  it('accepts its own signature only', () => {
    const signature = paymentSignature('payment-1', SECRET)
    expect(isPaymentSignature('payment-1', signature, SECRET)).toBe(true)
    expect(isPaymentSignature('payment-2', signature, SECRET)).toBe(false)
    expect(isPaymentSignature('payment-1', 'nope', SECRET)).toBe(false)
  })

  it('differs from the visit link signature', () => {
    expect(paymentSignature('x', SECRET)).not.toBe(paymentSignature('y', SECRET))
  })
})
