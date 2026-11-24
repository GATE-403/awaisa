import { setupI18n } from '@lingui/core'
import { describe, expect, it } from 'vitest'
import {
  formatAmount,
  formatDate,
  formatMoney,
  formatNumber,
  makeFormat,
  moneyLabel,
} from '../format'

const formatIn = (locale: string) => makeFormat(setupI18n({ locale, messages: { [locale]: {} } }))

describe('money', () => {
  it('groups and labels a price in the page language', () => {
    expect(formatIn('en').price(1500)).toBe('1,500 som')
    expect(formatIn('ru').price(1500)).toBe('1 500 сом')
    expect(formatIn('ky').price(1500)).toBe('1 500 сом')
    expect(formatIn('ru').price(900)).toBe('900 сом')
  })

  it('gives the amount and the label apart', () => {
    const russian = formatIn('ru')
    expect(russian.amount(1250000)).toBe('1 250 000')
    expect(russian.currency).toBe('сом')
    expect(formatIn('en').currency).toBe('som')
  })

  it('formats without a hook for server pages', () => {
    expect(formatMoney('en', 25000)).toBe('25,000 som')
    expect(formatMoney('ky', 25000)).toBe('25 000 сом')
    expect(formatAmount('ru', 1500)).toBe('1 500')
    expect(moneyLabel('ky')).toBe('сом')
  })
})

describe('numbers', () => {
  it('writes a rating with the language own decimal mark', () => {
    expect(formatIn('en').number(4.4)).toBe('4.4')
    expect(formatIn('ru').number(4.4)).toBe('4,4')
    expect(formatIn('ky').number(4.4)).toBe('4,4')
    expect(formatNumber('ru', 4, { minimumFractionDigits: 1 })).toBe('4,0')
  })

  it('gives a star rating one decimal', () => {
    expect(formatIn('en').rating(4)).toBe('4.0')
    expect(formatIn('ru').rating(4.44)).toBe('4,4')
  })

  it('groups counts with a no-break space in Russian', () => {
    expect(formatIn('en').number(12345)).toBe('12,345')
    expect(formatNumber('ru', 12345)).toBe('12\u00a0345')
  })
})

describe('dates', () => {
  // 20 November 2026, 09:30 in Bishkek (UTC+6).
  const moment = '2026-11-20T03:30:00Z'

  it('formats a moment on the region clock in the page language', () => {
    expect(formatIn('en').date(moment, { day: 'numeric', month: 'long' })).toBe('20 November')
    expect(formatIn('ru').date(moment, { day: 'numeric', month: 'long' })).toBe('20 ноября')
    expect(formatDate('ru', moment, { day: 'numeric', month: 'short' })).toBe('20 нояб.')
  })

  it('uses its own Kyrgyz month and weekday names', () => {
    const kyrgyz = formatIn('ky')
    expect(kyrgyz.date(moment, { day: 'numeric', month: 'long' })).toBe('20-ноябрь')
    expect(kyrgyz.date(moment, { day: 'numeric', month: 'short' })).toBe('20-ноя')
    expect(kyrgyz.date(moment, { month: 'long', year: 'numeric' })).toBe('ноябрь 2026')
    expect(
      formatDate('ky', moment, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      }),
    ).toBe('жума, 20-ноябрь, 09:30')
  })

  it('keeps the day of a moment late in the UTC evening', () => {
    expect(formatDate('en', '2026-11-20T20:00:00Z', { day: 'numeric', month: 'long' })).toBe(
      '21 November',
    )
    expect(
      formatDate('en', '2026-11-20T20:00:00Z', { day: 'numeric', month: 'long', timeZone: 'UTC' }),
    ).toBe('20 November')
  })
})
