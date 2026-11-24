import { parseRegion } from '@awaisa/region'
import { describe, expect, it } from 'vitest'
import { formatPhone } from '../formatPhone'
import { maskAmountInput, maskLocalPhoneInput, maskPhoneInput, phoneProblem } from '../inputMasks'

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

describe('maskPhoneInput', () => {
  it('formats a number of the region however it is typed', () => {
    for (const typed of [
      '0555123456',
      '555123456',
      '555 12 34 56',
      '+996555123456',
      '996 555 123 456',
    ]) {
      expect(maskPhoneInput(typed), typed).toBe('+996 555 123 456')
    }
  })

  it('formats a number still being typed', () => {
    expect(maskPhoneInput('5')).toBe('+996 5')
    expect(maskPhoneInput('5551')).toBe('+996 555 1')
    expect(maskPhoneInput('')).toBe('')
  })

  it('stops at nine local digits', () => {
    expect(maskPhoneInput('5551234567890')).toBe('+996 555 123 456')
  })

  it('leaves another country’s number as typed', () => {
    expect(maskPhoneInput('+7 999 123-45-67')).toBe('+7 999 123-45-67')
  })
})

describe('maskLocalPhoneInput', () => {
  it('reads what is typed after a fixed +996, a pasted whole number too', () => {
    expect(maskLocalPhoneInput('555123456')).toBe('+996 555 123 456')
    expect(maskLocalPhoneInput('+996 555 123 456')).toBe('+996 555 123 456')
    // Nine digits that start with 996 are a local number, not the country code.
    expect(maskLocalPhoneInput('996123456')).toBe('+996 996 123 456')
  })
})

describe('phoneProblem', () => {
  it('passes a whole number', () => {
    expect(phoneProblem('+996 555 123 456')).toBeNull()
    expect(phoneProblem('0555123456')).toBeNull()
  })

  it('names what is wrong', () => {
    expect(phoneProblem(' ')).toBe('Введите номер телефона')
    expect(phoneProblem('+7 999 1234567')).toBe('Пока принимаем только номера с кодом +996')
    expect(phoneProblem('+996 555 12')).toBe('Номер неполный: после +996 нужно 9 цифр')
  })
})

describe('maskAmountInput', () => {
  it('groups thousands with a non-breaking space', () => {
    expect(maskAmountInput('1500')).toBe('1\u00a0500')
    expect(maskAmountInput('1250000')).toBe('1\u00a0250\u00a0000')
    expect(maskAmountInput('900')).toBe('900')
    expect(maskAmountInput('')).toBe('')
  })
})

describe('another region', () => {
  it('masks, checks and reads numbers by its own code, length and grouping', () => {
    expect(maskPhoneInput('8 701 123 45 67', ALMATY)).toBe('+7 701 123 45 67')
    expect(maskLocalPhoneInput('7011234567', ALMATY)).toBe('+7 701 123 45 67')
    expect(phoneProblem('+7 701 123 45 67', ALMATY)).toBeNull()
    expect(phoneProblem('+996 555 123 456', ALMATY)).toBe('Пока принимаем только номера с кодом +7')
    expect(phoneProblem('+7 701 12', ALMATY)).toBe('Номер неполный: после +7 нужно 10 цифр')
  })
})

describe('formatPhone', () => {
  it('groups a number of the region and leaves others as they are', () => {
    expect(formatPhone('+996555123456')).toBe('+996 555 123 456')
    expect(formatPhone('+77011234567')).toBe('+77011234567')
  })
})
