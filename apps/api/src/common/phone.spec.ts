import { isAllowedDestination, maskPhone, normalizePhone } from './phone.js'

describe('normalizePhone', () => {
  it.each([
    ['555 123 456', '+996555123456'],
    ['0555 123 456', '+996555123456'],
    ['+996 (555) 12-34-56', '+996555123456'],
    ['996555123456', '+996555123456'],
    ['+7 701 123 45 67', '+77011234567'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected)
  })

  it.each(['', '12345', '1'.repeat(16)])('rejects %s', (input) => {
    expect(normalizePhone(input)).toBeNull()
  })
})

describe('maskPhone', () => {
  it('keeps only the last four digits', () => {
    expect(maskPhone('+996555123456')).toBe('+••••••••3456')
  })
})

describe('isAllowedDestination', () => {
  it('lets texts go only to the listed countries', () => {
    expect(isAllowedDestination('+996555123456', ['996'])).toBe(true)
    expect(isAllowedDestination('+77011234567', ['996'])).toBe(false)
    expect(isAllowedDestination('+77011234567', ['996', '7'])).toBe(true)
    expect(isAllowedDestination('+2347011234567', ['*'])).toBe(true)
  })
})
