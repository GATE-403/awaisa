'use client'

import { Input } from '@awaisa/ui/Input'
import { Select } from '@awaisa/ui/Select'
import { Switch } from '@awaisa/ui/Switch'
import { type FormEvent, useState } from 'react'
import type { FiscalSettings, FiscalSettingsInput, TaxRegime } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import { defaultSalesTax, isInnValid, TAX_REGIMES } from './fiscalFormat'

interface FiscalSheetProps {
  settings: FiscalSettings
  /** Opened by switching receipts on: they turn on with the save. */
  isEnabling: boolean
  onClose: () => void
  onSave: (input: FiscalSettingsInput) => Promise<boolean>
}

const FORM_ID = 'fiscal-settings'

const toRate = (value: string) => Number(value.replace(',', '.')) || 0
const cleanRate = (value: string) => value.replace(/[^\d.,]/g, '').slice(0, 5)

// What a receipt needs from the business: the TIN, the tax regime and the rates, and its own
// login at the provider. Turning VAT on or off resets the sales tax to the law's rates for it.
export const FiscalSheet = ({ settings, isEnabling, onClose, onSave }: FiscalSheetProps) => {
  const t = useT()
  const [inn, setInn] = useState(settings.inn ?? '')
  const [taxRegime, setTaxRegime] = useState<TaxRegime>(settings.taxRegime)
  const [isVatPayer, setIsVatPayer] = useState(settings.isVatPayer)
  const [vatRate, setVatRate] = useState(String(settings.vatRate))
  const [services, setServices] = useState(String(settings.salesTaxServices))
  const [goods, setGoods] = useState(String(settings.salesTaxGoods))
  const [login, setLogin] = useState(settings.login ?? '')
  const [password, setPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const isEnabled = settings.isEnabled || isEnabling
  const isInnMissing = isEnabled && inn.trim() === ''
  const isInnWrong = inn.trim() !== '' && !isInnValid(inn)

  const changeVatPayer = (checked: boolean) => {
    setIsVatPayer(checked)
    const rates = defaultSalesTax(checked)
    setServices(String(rates.services))
    setGoods(String(rates.goods))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setIsSaving(true)
    const isSaved = await onSave({
      isEnabled,
      inn: inn.trim() || null,
      taxRegime,
      isVatPayer,
      vatRate: toRate(vatRate),
      salesTaxServices: toRate(services),
      salesTaxGoods: toRate(goods),
      login: login.trim() || null,
      password: password || null,
    })
    setIsSaving(false)
    if (isSaved) onClose()
  }

  return (
    <Sheet
      title={t('Till')}
      onClose={onClose}
      action={{
        label: t(isEnabling ? 'Turn on' : 'Save'),
        form: FORM_ID,
        disabled: isInnMissing || isInnWrong || isSaving,
      }}
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className={sheet.form}>
        <section className={sheet.group} aria-label={t('Details')}>
          <SectionCaption>{t('Details')}</SectionCaption>
          <div className={sheet.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>{t('TIN')}</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  inputMode='numeric'
                  aria-label={t('TIN')}
                  placeholder={t('14 digits')}
                  autoFocus={isEnabling && !settings.inn}
                  aria-invalid={isInnWrong || undefined}
                  value={inn}
                  onValueChange={(value) => setInn(value.replace(/\D/g, '').slice(0, 14))}
                />
              </span>
            </label>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Regime')}</span>
              <Select
                variant='plain'
                aria-label={t('Tax regime')}
                items={TAX_REGIMES.map((item) => ({ ...item, label: t(item.label) }))}
                value={taxRegime}
                onValueChange={(value) => value && setTaxRegime(value)}
              />
            </div>
          </div>
          <p className={sheet.groupFooter}>
            {isInnWrong
              ? t('TIN: 14 digits.')
              : taxRegime === 'patent'
                ? t('On a patent a till is optional: you may issue receipts if you wish.')
                : t('As in the registration certificate and the cash register card.')}
          </p>
        </section>

        <section className={sheet.group} aria-label={t('Taxes on the receipt')}>
          <SectionCaption>{t('Taxes on the receipt')}</SectionCaption>
          <div className={sheet.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>{t('VAT payer')}</span>
              <Switch checked={isVatPayer} onCheckedChange={changeVatPayer} />
            </label>
            {isVatPayer && (
              <label className={sheet.row}>
                <span className={sheet.rowLabel}>{t('VAT')}</span>
                <span className={sheet.rowControl}>
                  <Input
                    variant='plain'
                    inputMode='decimal'
                    aria-label={t('VAT, %')}
                    value={vatRate}
                    onValueChange={(value) => setVatRate(cleanRate(value))}
                  />
                  <span className={sheet.suffix}>%</span>
                </span>
              </label>
            )}
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Sales tax on services')}</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  inputMode='decimal'
                  aria-label={t('Sales tax on services, %')}
                  value={services}
                  onValueChange={(value) => setServices(cleanRate(value))}
                />
                <span className={sheet.suffix}>%</span>
              </span>
            </label>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Sales tax on goods')}</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  inputMode='decimal'
                  aria-label={t('Sales tax on goods, %')}
                  value={goods}
                  onValueChange={(value) => setGoods(cleanRate(value))}
                />
                <span className={sheet.suffix}>%</span>
              </span>
            </label>
          </div>
          <p className={sheet.groupFooter}>
            {t(
              'Taxes are included in the price: the receipt shows how much of the total they are. Check the rates with your accountant.',
            )}
          </p>
        </section>

        {settings.driver === 'ekassa' && (
          <section className={sheet.group} aria-label='eKassa'>
            <SectionCaption>eKassa</SectionCaption>
            <div className={sheet.list}>
              <label className={sheet.row}>
                <span className={sheet.rowLabel}>{t('Login')}</span>
                <span className={sheet.rowControl}>
                  <Input
                    variant='plain'
                    aria-label={t('eKassa login')}
                    autoComplete='off'
                    placeholder={t('eKassa email')}
                    value={login}
                    onValueChange={setLogin}
                  />
                </span>
              </label>
              <label className={sheet.row}>
                <span className={sheet.rowLabel}>{t('Password')}</span>
                <span className={sheet.rowControl}>
                  <Input
                    variant='plain'
                    type='password'
                    aria-label={t('eKassa password')}
                    autoComplete='new-password'
                    placeholder={t(settings.hasPassword ? 'Saved' : 'Password')}
                    value={password}
                    onValueChange={setPassword}
                  />
                </span>
              </label>
            </div>
            <p className={sheet.groupFooter}>
              {t('Your cloud till in eKassa under your TIN. The password is stored encrypted.')}
            </p>
          </section>
        )}
      </form>
    </Sheet>
  )
}
