import { describe, expect, it } from 'vitest'
import type { FiscalSettings } from '@/shared/api/types'
import {
  defaultSalesTax,
  describeTaxes,
  isInnValid,
  regimeLabel,
} from '../ui/FiscalTab/fiscalFormat'

const SETTINGS: FiscalSettings = {
  driver: 'log',
  isEnabled: true,
  inn: '01234567890123',
  taxRegime: 'general',
  isVatPayer: true,
  vatRate: 12,
  salesTaxServices: 2,
  salesTaxGoods: 1,
  login: null,
  hasPassword: false,
}

describe('fiscal settings wording', () => {
  it('gives the law’s sales tax for VAT payers and the rest', () => {
    expect(defaultSalesTax(true)).toEqual({ services: 2, goods: 1 })
    expect(defaultSalesTax(false)).toEqual({ services: 3, goods: 2 })
  })

  it('takes a 14-digit TIN only', () => {
    expect(isInnValid('01234567890123')).toBe(true)
    expect(isInnValid('0123456789012')).toBe(false)
  })

  it('reads the taxes as one value each', () => {
    expect(describeTaxes(SETTINGS)).toEqual({ vat: '12%', salesTax: 'services 2% · goods 1%' })
    expect(describeTaxes({ ...SETTINGS, isVatPayer: false, salesTaxServices: 2.5 }).vat).toBe(
      'Not a payer',
    )
    expect(describeTaxes({ ...SETTINGS, salesTaxServices: 2.5 }).salesTax).toBe(
      'services 2.5% · goods 1%',
    )
  })

  it('names the regimes', () => {
    expect(regimeLabel('single')).toBe('Single tax')
  })
})
