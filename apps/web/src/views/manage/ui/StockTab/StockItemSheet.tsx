'use client'

import { Button } from '@awaisa/ui/Button'
import { Input } from '@awaisa/ui/Input'
import { Select } from '@awaisa/ui/Select'
import { Switch } from '@awaisa/ui/Switch'
import { type FormEvent, useState } from 'react'
import type { Service, StockItem, StockItemInput } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { maskAmountInput } from '@/shared/lib/inputMasks'
import { HoldButton } from '@/shared/ui/HoldButton/HoldButton'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import { formatQuantity } from './formatQuantity'

interface StockItemSheetProps {
  item: StockItem | null
  services: Service[]
  onClose: () => void
  onSave: (input: StockItemInput) => Promise<boolean>
  /** `asExpense`: also record what the delivery cost in «Расходы». */
  onReceive?: (quantity: number, asExpense: boolean) => Promise<boolean>
  onAdjust?: (quantity: number) => Promise<boolean>
  onDelete?: () => void
}

const FORM_ID = 'stock-item-form'

// Stored as these words; translated only where shown.
const UNITS = ['шт', 'мл', 'г', 'пара', 'уп']

// Quantities may be fractional (12,5 мл): keep digits and one decimal separator.
const maskDecimal = (value: string) => {
  const [whole, ...rest] = value
    .replace('.', ',')
    .replace(/[^\d,]/g, '')
    .split(',')
  return rest.length > 0 ? `${whole},${rest.join('').slice(0, 2)}` : whole
}

const parseDecimal = (value: string) => Number(value.replace(',', '.') || 0)

export const StockItemSheet = ({
  item,
  services,
  onClose,
  onSave,
  onReceive,
  onAdjust,
  onDelete,
}: StockItemSheetProps) => {
  const t = useT()
  const [name, setName] = useState(item?.name ?? '')
  const [unit, setUnit] = useState(item?.unit ?? 'мл')
  const [unitCost, setUnitCost] = useState(item ? String(item.unitCost) : '')
  const [minQuantity, setMinQuantity] = useState(
    item?.minQuantity === null || item?.minQuantity === undefined
      ? ''
      : maskDecimal(String(item.minQuantity)),
  )
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (item?.materials ?? []).map((entry) => [entry.serviceId, maskDecimal(String(entry.amount))]),
    ),
  )
  const [isForSale, setIsForSale] = useState(item?.isForSale ?? false)
  const [salePrice, setSalePrice] = useState(
    item?.salePrice === null || item?.salePrice === undefined ? '' : String(item.salePrice),
  )
  const [received, setReceived] = useState('')
  const [isReceivedExpense, setIsReceivedExpense] = useState(true)
  const [counted, setCounted] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const isValid = name.trim() !== '' && unitCost !== '' && (!isForSale || salePrice !== '')
  const example = services.find((service) => parseDecimal(amounts[service.id] ?? '') > 0)
  const exampleCost = example
    ? Math.round(parseDecimal(amounts[example.id] ?? '') * parseDecimal(unitCost))
    : 0

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!isValid) return
    setIsSaving(true)
    const saved = await onSave({
      name: name.trim(),
      unit,
      unitCost: parseDecimal(unitCost),
      minQuantity: minQuantity === '' ? null : parseDecimal(minQuantity),
      materials: Object.entries(amounts)
        .map(([serviceId, amount]) => ({ serviceId, amount: parseDecimal(amount) }))
        .filter((entry) => entry.amount > 0),
      isForSale,
      salePrice: isForSale ? parseDecimal(salePrice) : null,
    })
    setIsSaving(false)
    if (saved) onClose()
  }

  const receive = async () => {
    if (!onReceive || parseDecimal(received) <= 0) return
    if (await onReceive(parseDecimal(received), isReceivedExpense)) setReceived('')
  }

  const adjust = async () => {
    if (!onAdjust || counted === '') return
    if (await onAdjust(parseDecimal(counted))) setCounted('')
  }

  return (
    <Sheet
      title={t(item ? (item.isForSale ? 'Товар' : 'Расходник') : 'Новый расходник')}
      onClose={onClose}
      action={{ label: t('Сохранить'), form: FORM_ID, disabled: !isValid || isSaving }}
    >
      <form id={FORM_ID} className={sheet.form} onSubmit={handleSubmit}>
        <div className={sheet.list}>
          <div className={`${sheet.row} ${sheet.textRow}`}>
            <Input
              variant='plain'
              aria-label={t('Название')}
              placeholder={t('Например, «Краска для волос»')}
              value={name}
              onValueChange={setName}
              autoFocus={!item}
            />
          </div>
          <div className={sheet.row}>
            <span className={sheet.rowLabel}>{t('Единица')}</span>
            <span className={sheet.rowControl}>
              <Select
                variant='plain'
                aria-label={t('Единица')}
                items={UNITS.map((value) => ({ value, label: t(value) }))}
                value={unit}
                onValueChange={(value) => value && setUnit(value)}
              />
            </span>
          </div>
          <label className={sheet.row}>
            <span className={sheet.rowLabel}>{t('Цена за {unit}', { unit: t(unit) })}</span>
            <span className={sheet.rowControl}>
              <Input
                variant='plain'
                aria-label={t('Цена за единицу, сом')}
                inputMode='decimal'
                placeholder='0'
                value={unitCost}
                onValueChange={(value) => setUnitCost(maskDecimal(value))}
              />
              <span className={sheet.suffix}>{t('сом')}</span>
            </span>
          </label>
          <label className={sheet.row}>
            <span className={sheet.rowLabel}>{t('Предупредить, когда')}</span>
            <span className={sheet.rowControl}>
              <Input
                variant='plain'
                aria-label={t('Минимальный остаток')}
                inputMode='decimal'
                placeholder={t('Не нужно')}
                value={minQuantity}
                onValueChange={(value) => setMinQuantity(maskDecimal(value))}
              />
              {minQuantity !== '' && <span className={sheet.suffix}>{t(unit)}</span>}
            </span>
          </label>
        </div>

        <section className={sheet.group} aria-label={t('Продажа')}>
          <div className={sheet.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Продаётся клиентам')}</span>
              <Switch checked={isForSale} onCheckedChange={setIsForSale} />
            </label>
            {isForSale && (
              <label className={sheet.row}>
                <span className={sheet.rowLabel}>{t('Цена продажи')}</span>
                <span className={sheet.rowControl}>
                  <Input
                    variant='plain'
                    aria-label={t('Цена продажи, сом')}
                    inputMode='decimal'
                    placeholder='0'
                    value={salePrice}
                    onValueChange={(value) => setSalePrice(maskDecimal(value))}
                  />
                  <span className={sheet.suffix}>{t('сом')}</span>
                </span>
              </label>
            )}
          </div>
          <p className={sheet.groupFooter}>
            {isForSale
              ? t('Продаётся в «Кассе» и в итоге визита, остаток уменьшается сам.')
              : t('Шампунь, воск, масло: продавайте с визитом или отдельно.')}
          </p>
        </section>

        {item && (
          <section className={sheet.group} aria-label={t('Остаток')}>
            <SectionCaption>
              {t('Остаток · {count} {unit}', {
                count: formatQuantity(item.quantity),
                unit: t(item.unit),
              })}
            </SectionCaption>
            <div className={sheet.list}>
              <div className={sheet.row}>
                <span className={sheet.rowControl}>
                  <Input
                    variant='plain'
                    aria-label={t('Приход')}
                    inputMode='decimal'
                    placeholder={t('Приход, {unit}', { unit: t(unit) })}
                    value={received}
                    onValueChange={(value) => setReceived(maskDecimal(value))}
                  />
                </span>
                <Button
                  size='sm'
                  variant='outline'
                  disabled={parseDecimal(received) <= 0}
                  onClick={() => void receive()}
                >
                  {t('Принять')}
                </Button>
              </div>
              {parseDecimal(received) > 0 && (
                <label className={sheet.row}>
                  <span className={sheet.rowLabel}>
                    {t('Записать в расходы · {amount} сом', {
                      amount: maskAmountInput(
                        String(Math.round(parseDecimal(received) * item.unitCost)),
                      ),
                    })}
                  </span>
                  <Switch checked={isReceivedExpense} onCheckedChange={setIsReceivedExpense} />
                </label>
              )}
              <div className={sheet.row}>
                <span className={sheet.rowControl}>
                  <Input
                    variant='plain'
                    aria-label={t('Остаток по факту')}
                    inputMode='decimal'
                    placeholder={t('Остаток по факту')}
                    value={counted}
                    onValueChange={(value) => setCounted(maskDecimal(value))}
                  />
                </span>
                <Button
                  size='sm'
                  variant='secondary'
                  disabled={counted === ''}
                  onClick={() => void adjust()}
                >
                  {t('Исправить')}
                </Button>
              </div>
            </div>
          </section>
        )}

        {services.length > 0 && (
          <section className={sheet.group} aria-label={t('Расход на услугу')}>
            <SectionCaption>{t('Расход на одну услугу')}</SectionCaption>
            <div className={sheet.list}>
              {services.map((service) => (
                <label key={service.id} className={sheet.row}>
                  <span className={sheet.rowLabel}>{service.name}</span>
                  <span className={sheet.rowControl}>
                    <Input
                      variant='plain'
                      aria-label={t('Расход: {name}', { name: service.name })}
                      inputMode='decimal'
                      placeholder='—'
                      value={amounts[service.id] ?? ''}
                      onValueChange={(value) =>
                        setAmounts((current) => ({ ...current, [service.id]: maskDecimal(value) }))
                      }
                    />
                    {amounts[service.id] && <span className={sheet.suffix}>{t(unit)}</span>}
                  </span>
                </label>
              ))}
            </div>
            <p className={sheet.groupFooter}>
              {example && exampleCost > 0
                ? t('«{name}» — {amount} сом материалов за визит.', {
                    name: example.name,
                    amount: maskAmountInput(String(exampleCost)),
                  })
                : t('Сколько уходит на один визит — спишется, когда визит отмечен «Пришёл».')}
            </p>
          </section>
        )}

        {onDelete && (
          <HoldButton
            onConfirm={() => {
              onDelete()
              onClose()
            }}
          >
            {t('Удалить позицию')}
          </HoldButton>
        )}
      </form>
    </Sheet>
  )
}
