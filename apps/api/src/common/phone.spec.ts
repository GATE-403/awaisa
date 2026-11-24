import { parseRegion } from '@awaisa/region'
import { formatPhone, hidePhone, isAllowedDestination, maskPhone, normalizePhone } from './phone.js'

// Another installation's shape of number: the rules come from its region, the code knows none.
const ALMATY = parseRegion({
  country: 'KZ',
  timeZone: 'Asia/Almaty',
  phone: {
    callingCode: '7',
    nationalDigits: 10,
    trunkPrefix: '8',
    groups: [3, 3, 2, 2],
    example: '7011234567',
  },
  currency: { code: 'KZT', label: 'тг' },
  city: { name: 'Алматы', center: { latitude: 43.24, longitude: 76.89 } },
})

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

  it.each([
    ['701 123 45 67', '+77011234567'],
    ['8 701 123 45 67', '+77011234567'],
    ['+996 555 123 456', '+996555123456'],
  ])('reads %s by another region’s rules', (input, expected) => {
    expect(normalizePhone(input, ALMATY)).toBe(expected)
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

describe('formatPhone and hidePhone', () => {
  it('group a number of the region and leave others as they are', () => {
    expect(formatPhone('+996555123456')).toBe('+996 555 123 456')
    expect(formatPhone('+77011234567')).toBe('+77011234567')
    expect(formatPhone('+77011234567', ALMATY)).toBe('+7 701 123 45 67')
  })

  it('show only the country and the last three digits', () => {
    expect(hidePhone('+996555123456')).toBe('+996 ••• ••• 456')
    expect(hidePhone('+77011234567')).toBe('+••• ••• 567')
    expect(hidePhone('+77011234567', ALMATY)).toBe('+7 ••• ••• 567')
  })
})
