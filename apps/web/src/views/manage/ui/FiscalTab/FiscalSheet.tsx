'use client'

import { Input } from '@awaisa/ui/Input'
import { Select } from '@awaisa/ui/Select'
import { Switch } from '@awaisa/ui/Switch'
import { type FormEvent, useState } from 'react'
import type { FiscalSettings, FiscalSettingsInput, TaxRegime } from '@/shared/api/types'
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

// What a receipt needs from the business: the ИНН, the tax regime and the rates, and its own
// login at the provider. Turning VAT on or off resets the sales tax to the law's rates for it.
export const FiscalSheet = ({ settings, isEnabling, onClose, onSave }: FiscalSheetProps) => {
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
      title='Касса'
      onClose={onClose}
      action={{
        label: isEnabling ? 'Включить' : 'Сохранить',
        form: FORM_ID,
        disabled: isInnMissing || isInnWrong || isSaving,
      }}
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className={sheet.form}>
        <section className={sheet.group} aria-label='Реквизиты'>
          <SectionCaption>Реквизиты</SectionCaption>
          <div className={sheet.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>ИНН</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  inputMode='numeric'
                  aria-label='ИНН'
                  placeholder='14 цифр'
                  autoFocus={isEnabling && !settings.inn}
                  aria-invalid={isInnWrong || undefined}
                  value={inn}
                  onValueChange={(value) => setInn(value.replace(/\D/g, '').slice(0, 14))}
                />
              </span>
            </label>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>Режим</span>
              <Select
                variant='plain'
                aria-label='Режим налогообложения'
                items={TAX_REGIMES}
                value={taxRegime}
                onValueChange={(value) => value && setTaxRegime(value)}
              />
            </div>
          </div>
          <p className={sheet.groupFooter}>
            {isInnWrong
              ? 'ИНН: 14 цифр.'
              : taxRegime === 'patent'
                ? 'На патенте касса не обязательна: чеки можно выдавать по желанию.'
                : 'Как в свидетельстве о регистрации и в карточке ККМ.'}
          </p>
        </section>

        <section className={sheet.group} aria-label='Налоги в чеке'>
          <SectionCaption>Налоги в чеке</SectionCaption>
          <div className={sheet.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>Плательщик НДС</span>
              <Switch checked={isVatPayer} onCheckedChange={changeVatPayer} />
            </label>
            {isVatPayer && (
              <label className={sheet.row}>
                <span className={sheet.rowLabel}>НДС</span>
                <span className={sheet.rowControl}>
                  <Input
                    variant='plain'
                    inputMode='decimal'
                    aria-label='НДС, %'
                    value={vatRate}
                    onValueChange={(value) => setVatRate(cleanRate(value))}
                  />
                  <span className={sheet.suffix}>%</span>
                </span>
              </label>
            )}
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>НсП на услуги</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  inputMode='decimal'
                  aria-label='НсП на услуги, %'
                  value={services}
                  onValueChange={(value) => setServices(cleanRate(value))}
                />
                <span className={sheet.suffix}>%</span>
              </span>
            </label>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>НсП на товары</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  inputMode='decimal'
                  aria-label='НсП на товары, %'
                  value={goods}
                  onValueChange={(value) => setGoods(cleanRate(value))}
                />
                <span className={sheet.suffix}>%</span>
              </span>
            </label>
          </div>
          <p className={sheet.groupFooter}>
            Налоги уже в цене: чек показывает, сколько их в сумме. Уточните ставки у бухгалтера.
          </p>
        </section>

        {settings.driver === 'ekassa' && (
          <section className={sheet.group} aria-label='eKassa'>
            <SectionCaption>eKassa</SectionCaption>
            <div className={sheet.list}>
              <label className={sheet.row}>
                <span className={sheet.rowLabel}>Логин</span>
                <span className={sheet.rowControl}>
                  <Input
                    variant='plain'
                    aria-label='Логин eKassa'
                    autoComplete='off'
                    placeholder='Почта в eKassa'
                    value={login}
                    onValueChange={setLogin}
                  />
                </span>
              </label>
              <label className={sheet.row}>
                <span className={sheet.rowLabel}>Пароль</span>
                <span className={sheet.rowControl}>
                  <Input
                    variant='plain'
                    type='password'
                    aria-label='Пароль eKassa'
                    autoComplete='new-password'
                    placeholder={settings.hasPassword ? 'Сохранён' : 'Пароль'}
                    value={password}
                    onValueChange={setPassword}
                  />
                </span>
              </label>
            </div>
            <p className={sheet.groupFooter}>
              Ваша облачная касса в eKassa на ваш ИНН. Пароль хранится зашифрованным.
            </p>
          </section>
        )}
      </form>
    </Sheet>
  )
}
