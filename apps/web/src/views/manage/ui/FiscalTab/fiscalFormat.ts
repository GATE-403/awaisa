import type { FiscalSettings, TaxRegime } from '@/shared/api/types'

type Tr = (text: string, vars?: Record<string, string | number>) => string

// Callers without a translator (and the unit tests) read the words filled in.
const plain: Tr = (text, vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (match, key: string) => String(vars[key] ?? match)) : text

const TAX_REGIMES: { value: TaxRegime; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'single', label: 'Single tax' },
  { value: 'patent', label: 'Patent' },
]

/** Sales tax by the Tax Code (art. 368): lower for VAT payers, lower on goods than on services. */
const defaultSalesTax = (isVatPayer: boolean) =>
  isVatPayer ? { services: 2, goods: 1 } : { services: 3, goods: 2 }

const isInnValid = (inn: string) => /^\d{14}$/.test(inn.trim())

const formatRate = (value: number) => `${value}%`

/** "Sales tax: services 2% · goods 1%" in one value. */
const describeTaxes = (settings: FiscalSettings, t: Tr = plain) => ({
  vat: settings.isVatPayer ? formatRate(settings.vatRate) : t('Not a payer'),
  salesTax: t('services {services} · goods {goods}', {
    services: formatRate(settings.salesTaxServices),
    goods: formatRate(settings.salesTaxGoods),
  }),
})

const regimeLabel = (regime: TaxRegime, t: Tr = plain) => {
  const label = TAX_REGIMES.find((item) => item.value === regime)?.label
  return label ? t(label) : regime
}

export { defaultSalesTax, describeTaxes, isInnValid, regimeLabel, TAX_REGIMES }
