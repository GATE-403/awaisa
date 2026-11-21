import type { FiscalSettings, TaxRegime } from '@/shared/api/types'

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
const describeTaxes = (settings: FiscalSettings) => ({
  vat: settings.isVatPayer ? formatRate(settings.vatRate) : 'Не плательщик',
  salesTax: `услуги ${formatRate(settings.salesTaxServices)} · товары ${formatRate(settings.salesTaxGoods)}`,
})

const regimeLabel = (regime: TaxRegime) =>
  TAX_REGIMES.find((item) => item.value === regime)?.label ?? regime

export { defaultSalesTax, describeTaxes, isInnValid, regimeLabel, TAX_REGIMES }
