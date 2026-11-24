import { describe, expect, it } from 'vitest'
import { validateEnv } from './env.js'

const base = { DATABASE_URL: 'postgres://awaisa:awaisa@localhost:5432/awaisa' }

describe('TRUST_PROXY', () => {
  it('trusts only our own network by default', () => {
    expect(validateEnv(base).TRUST_PROXY).toBe('loopback, linklocal, uniquelocal')
    expect(validateEnv({ ...base, TRUST_PROXY: '' }).TRUST_PROXY).toBe(
      'loopback, linklocal, uniquelocal',
    )
  })

  it('takes a hop count behind a public proxy', () => {
    expect(validateEnv({ ...base, TRUST_PROXY: '2' }).TRUST_PROXY).toBe(2)
    expect(() => validateEnv({ ...base, TRUST_PROXY: '0' })).toThrow('hop count')
    expect(() => validateEnv({ ...base, TRUST_PROXY: '42' })).toThrow('hop count')
  })

  it('takes names and IP ranges, and refuses anything else', () => {
    expect(
      validateEnv({ ...base, TRUST_PROXY: 'loopback,173.245.48.0/20, 2400:cb00::/32' }).TRUST_PROXY,
    ).toBe('loopback, 173.245.48.0/20, 2400:cb00::/32')
    // `true` would trust any hop: a client could then name any IP and dodge rate limits.
    expect(() => validateEnv({ ...base, TRUST_PROXY: 'true' })).toThrow('“true”')
  })
})

describe('production guards', () => {
  const production = {
    ...base,
    NODE_ENV: 'production',
    AUTH_SECRET: 'x'.repeat(32),
  }

  it('refuses a short secret and test-only drivers', () => {
    expect(() => validateEnv({ ...production, AUTH_SECRET: 'short' })).toThrow('AUTH_SECRET')
    expect(() => validateEnv({ ...production, OTP_TEST_CODE: '111111' })).toThrow('OTP_TEST_CODE')
    expect(() => validateEnv({ ...production, PAYMENT_DRIVER: 'test' })).toThrow('PAYMENT_DRIVER')
    expect(() => validateEnv({ ...production, FISCAL_DRIVER: 'log' })).toThrow('FISCAL_DRIVER')
  })

  it('keeps money and receipts off unless asked for', () => {
    const env = validateEnv(production)
    expect(env.PAYMENT_DRIVER).toBe('none')
    expect(env.FISCAL_DRIVER).toBe('off')
    expect(env.WHATSAPP_DRIVER).toBe('off')
  })
})
