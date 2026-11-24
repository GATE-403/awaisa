'use client'

import { Button } from '@awaisa/ui/Button'
import { Input } from '@awaisa/ui/Input'
import { Select } from '@awaisa/ui/Select'
import { Switch } from '@awaisa/ui/Switch'
import { ph } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { type FormEvent, useState } from 'react'
import type { Service, StockItem, StockItemInput } from '@/shared/api/types'
import { useFormat } from '@/shared/i18n'
import { HoldButton } from '@/shared/ui/HoldButton/HoldButton'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import { formatQuantity } from './formatQuantity'
import { UNITS, unitLabel } from './stockUnits'

interface StockItemSheetProps {
  item: StockItem | null
  services: Service[]
  onClose: () => void
  onSave: (input: StockItemInput) => Promise<boolean>
  /** `asExpense`: also record what the delivery cost in "Expenses". */
  onReceive?: (quantity: number, asExpense: boolean) => Promise<boolean>
  onAdjust?: (quantity: number) => Promise<boolean>
  onDelete?: () => void
}

const FORM_ID = 'stock-item-form'

// Quantities may be fractional (12.5 ml): keep digits and one decimal separator.
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
  const format = useFormat()
  const { t } = useLingui()
  const [name, setName] = useState(item?.name ?? '')
  const [unit, setUnit] = useState(item?.unit ?? 'ml')
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
      title={item ? (item.isForSale ? t`Product` : t`Consumable`) : t`New consumable`}
      onClose={onClose}
      action={{ label: t`Save`, form: FORM_ID, disabled: !isValid || isSaving }}
    >
      <form id={FORM_ID} className={sheet.form} onSubmit={handleSubmit}>
        <div className={sheet.list}>
          <div className={`${sheet.row} ${sheet.textRow}`}>
            <Input
              variant='plain'
              aria-label={t({ message: 'Name', context: 'name of a thing, not a person' })}
              placeholder={t`For example, “Hair dye”`}
              value={name}
              onValueChange={setName}
              autoFocus={!item}
            />
          </div>
          <div className={sheet.row}>
            <span className={sheet.rowLabel}>{t`Unit`}</span>
            <span className={sheet.rowControl}>
              <Select
                variant='plain'
                aria-label={t`Unit`}
                items={UNITS.map((value) => ({ value, label: unitLabel(value, t) }))}
                value={unit}
                onValueChange={(value) => value && setUnit(value)}
              />
            </span>
          </div>
          <label className={sheet.row}>
            <span
              className={sheet.rowLabel}
            >{t`Price per ${ph({ unit: unitLabel(unit, t) })}`}</span>
            <span className={sheet.rowControl}>
              <Input
                variant='plain'
                aria-label={t`Price per unit, som`}
                inputMode='decimal'
                placeholder='0'
                value={unitCost}
                onValueChange={(value) => setUnitCost(maskDecimal(value))}
              />
              <span className={sheet.suffix}>{format.currency}</span>
            </span>
          </label>
          <label className={sheet.row}>
            <span className={sheet.rowLabel}>{t`Warn at`}</span>
            <span className={sheet.rowControl}>
              <Input
                variant='plain'
                aria-label={t`Minimum stock`}
                inputMode='decimal'
                placeholder={t`Not needed`}
                value={minQuantity}
                onValueChange={(value) => setMinQuantity(maskDecimal(value))}
              />
              {minQuantity !== '' && <span className={sheet.suffix}>{unitLabel(unit, t)}</span>}
            </span>
          </label>
        </div>

        <section className={sheet.group} aria-label={t`Sale`}>
          <div className={sheet.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>{t`Sold to clients`}</span>
              <Switch checked={isForSale} onCheckedChange={setIsForSale} />
            </label>
            {isForSale && (
              <label className={sheet.row}>
                <span className={sheet.rowLabel}>{t`Sale price`}</span>
                <span className={sheet.rowControl}>
                  <Input
                    variant='plain'
                    aria-label={t`Sale price, som`}
                    inputMode='decimal'
                    placeholder='0'
                    value={salePrice}
                    onValueChange={(value) => setSalePrice(maskDecimal(value))}
                  />
                  <span className={sheet.suffix}>{format.currency}</span>
                </span>
              </label>
            )}
          </div>
          <p className={sheet.groupFooter}>
            {isForSale
              ? t`Sold in “Till” and in the visit outcome; the stock goes down by itself.`
              : t`Shampoo, wax, oil: sell with a visit or on their own.`}
          </p>
        </section>

        {item && (
          <section
            className={sheet.group}
            aria-label={t({ message: 'Stock', context: 'quantity left' })}
          >
            <SectionCaption>
              {t`Stock · ${ph({ count: formatQuantity(format, item.quantity) })} ${ph({ unit: unitLabel(item.unit, t) })}`}
            </SectionCaption>
            <div className={sheet.list}>
              <div className={sheet.row}>
                <span className={sheet.rowControl}>
                  <Input
                    variant='plain'
                    aria-label={t`Delivery`}
                    inputMode='decimal'
                    placeholder={t`Delivery, ${ph({ unit: unitLabel(unit, t) })}`}
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
                  {t`Receive`}
                </Button>
              </div>
              {parseDecimal(received) > 0 && (
                <label className={sheet.row}>
                  <span className={sheet.rowLabel}>
                    {t`Record as expense · ${ph({
                      amount: format.price(Math.round(parseDecimal(received) * item.unitCost)),
                    })}`}
                  </span>
                  <Switch checked={isReceivedExpense} onCheckedChange={setIsReceivedExpense} />
                </label>
              )}
              <div className={sheet.row}>
                <span className={sheet.rowControl}>
                  <Input
                    variant='plain'
                    aria-label={t`Actual stock`}
                    inputMode='decimal'
                    placeholder={t`Actual stock`}
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
                  {t`Correct`}
                </Button>
              </div>
            </div>
          </section>
        )}

        {services.length > 0 && (
          <section className={sheet.group} aria-label={t`Use per service`}>
            <SectionCaption>{t`Use per service`}</SectionCaption>
            <div className={sheet.list}>
              {services.map((service) => (
                <label key={service.id} className={sheet.row}>
                  <span className={sheet.rowLabel}>{service.name}</span>
                  <span className={sheet.rowControl}>
                    <Input
                      variant='plain'
                      aria-label={t`Use: ${ph({ name: service.name })}`}
                      inputMode='decimal'
                      placeholder='-'
                      value={amounts[service.id] ?? ''}
                      onValueChange={(value) =>
                        setAmounts((current) => ({ ...current, [service.id]: maskDecimal(value) }))
                      }
                    />
                    {amounts[service.id] && (
                      <span className={sheet.suffix}>{unitLabel(unit, t)}</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
            <p className={sheet.groupFooter}>
              {example && exampleCost > 0
                ? t`“${ph({ name: example.name })}”: ${ph({ amount: format.price(exampleCost) })} of materials per visit.`
                : t`How much one visit uses: written off when the visit is marked “Arrived”.`}
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
            {t`Delete item`}
          </HoldButton>
        )}
      </form>
    </Sheet>
  )
}
