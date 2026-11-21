import { describe, expect, it } from 'vitest'
import { maskAmountInput, maskLocalPhoneInput, maskPhoneInput, phoneProblem } from '../inputMasks'

describe('maskPhoneInput', () => {
  it('formats a Kyrgyz number however it is typed', () => {
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
    expect(phoneProblem('+7 999 1234567')).toBe('Пока принимаем только номера Кыргызстана: +996')
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
