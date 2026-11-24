import type { MessageDescriptor } from '@lingui/core'
import { msg, ph } from '@lingui/core/macro'
import type { FiscalSettings, TaxRegime } from '@/shared/api/types'
import type { Translate } from '@/shared/i18n'

const TAX_REGIMES: { value: TaxRegime; label: MessageDescriptor }[] = [
  { value: 'general', label: msg`General` },
  { value: 'single', label: msg`Single tax` },
  { value: 'patent', label: msg`Patent` },
]

/** Sales tax by the Tax Code (art. 368): lower for VAT payers, lower on goods than on services. */
const defaultSalesTax = (isVatPayer: boolean) =>
  isVatPayer ? { services: 2, goods: 1 } : { services: 3, goods: 2 }

const isInnValid = (inn: string) => /^\d{14}$/.test(inn.trim())

const formatRate = (value: number) => `${value}%`

/** "Sales tax: services 2% · goods 1%" in one value. */
const describeTaxes = (settings: FiscalSettings, t: Translate) => ({
  vat: settings.isVatPayer ? formatRate(settings.vatRate) : t(msg`Not a payer`),
  salesTax: t(
    msg`services ${ph({ services: formatRate(settings.salesTaxServices) })} · goods ${ph({ goods: formatRate(settings.salesTaxGoods) })}`,
  ),
})

const regimeLabel = (regime: TaxRegime, t: Translate) => {
  const label = TAX_REGIMES.find((item) => item.value === regime)?.label
  return label ? t(label) : regime
}

export { defaultSalesTax, describeTaxes, isInnValid, regimeLabel, TAX_REGIMES }
