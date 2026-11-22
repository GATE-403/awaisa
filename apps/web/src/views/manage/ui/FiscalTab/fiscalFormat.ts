import type { FiscalSettings, TaxRegime } from '@/shared/api/types'

type Tr = (text: string, vars?: Record<string, string | number>) => string

// Russian as it is: callers without a translator (and the unit tests) read the keys filled in.
const russian: Tr = (text, vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (match, key: string) => String(vars[key] ?? match)) : text

const TAX_REGIMES: { value: TaxRegime; label: string }[] = [
  { value: 'general', label: 'Общий' },
  { value: 'single', label: 'Единый налог' },
  { value: 'patent', label: 'Патент' },
]

/** НсП by the Tax Code (ст. 368): lower for VAT payers, lower on goods than on services. */
const defaultSalesTax = (isVatPayer: boolean) =>
  isVatPayer ? { services: 2, goods: 1 } : { services: 3, goods: 2 }

const isInnValid = (inn: string) => /^\d{14}$/.test(inn.trim())

const formatRate = (value: number) => `${String(value).replace('.', ',')}%`

/** «НсП: услуги 2% · товары 1%» in one value. */
const describeTaxes = (settings: FiscalSettings, t: Tr = russian) => ({
  vat: settings.isVatPayer ? formatRate(settings.vatRate) : t('Не плательщик'),
  salesTax: t('услуги {services} · товары {goods}', {
    services: formatRate(settings.salesTaxServices),
    goods: formatRate(settings.salesTaxGoods),
  }),
})

const regimeLabel = (regime: TaxRegime, t: Tr = russian) => {
  const label = TAX_REGIMES.find((item) => item.value === regime)?.label
  return label ? t(label) : regime
}

export { defaultSalesTax, describeTaxes, isInnValid, regimeLabel, TAX_REGIMES }
