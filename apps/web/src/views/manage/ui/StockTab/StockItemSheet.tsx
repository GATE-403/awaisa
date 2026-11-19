'use client'

import { Button } from '@awaisa/ui/Button'
import { Input } from '@awaisa/ui/Input'
import { Select } from '@awaisa/ui/Select'
import { type FormEvent, useState } from 'react'
import type { Service, StockItem, StockItemInput } from '@/shared/api/types'
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
  onReceive?: (quantity: number, unitCost?: number) => Promise<boolean>
  onAdjust?: (quantity: number) => Promise<boolean>
  onDelete?: () => void
}

const FORM_ID = 'stock-item-form'

const UNITS = ['шт', 'мл', 'г', 'пара', 'уп'].map((unit) => ({ value: unit, label: unit }))

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
  const [received, setReceived] = useState('')
  const [counted, setCounted] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const isValid = name.trim() !== '' && unitCost !== ''
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
    })
    setIsSaving(false)
    if (saved) onClose()
  }

  const receive = async () => {
    if (!onReceive || parseDecimal(received) <= 0) return
    if (await onReceive(parseDecimal(received))) setReceived('')
  }

  const adjust = async () => {
    if (!onAdjust || counted === '') return
    if (await onAdjust(parseDecimal(counted))) setCounted('')
  }

  return (
    <Sheet
      title={item ? 'Расходник' : 'Новый расходник'}
      onClose={onClose}
      action={{ label: 'Сохранить', form: FORM_ID, disabled: !isValid || isSaving }}
    >
      <form id={FORM_ID} className={sheet.form} onSubmit={handleSubmit}>
        <div className={sheet.list}>
          <div className={`${sheet.row} ${sheet.textRow}`}>
            <Input
              variant='plain'
              aria-label='Название'
              placeholder='Например, «Краска для волос»'
              value={name}
              onValueChange={setName}
              autoFocus={!item}
            />
          </div>
          <div className={sheet.row}>
            <span className={sheet.rowLabel}>Единица</span>
            <span className={sheet.rowControl}>
              <Select
                variant='plain'
                aria-label='Единица'
                items={UNITS}
                value={unit}
                onValueChange={(value) => value && setUnit(value)}
              />
            </span>
          </div>
          <label className={sheet.row}>
            <span className={sheet.rowLabel}>Цена за {unit}</span>
            <span className={sheet.rowControl}>
              <Input
                variant='plain'
                aria-label='Цена за единицу, сом'
                inputMode='decimal'
                placeholder='0'
                value={unitCost}
                onValueChange={(value) => setUnitCost(maskDecimal(value))}
              />
              <span className={sheet.suffix}>сом</span>
            </span>
          </label>
          <label className={sheet.row}>
            <span className={sheet.rowLabel}>Предупредить, когда</span>
            <span className={sheet.rowControl}>
              <Input
                variant='plain'
                aria-label='Минимальный остаток'
                inputMode='decimal'
                placeholder='Не нужно'
                value={minQuantity}
                onValueChange={(value) => setMinQuantity(maskDecimal(value))}
              />
              {minQuantity !== '' && <span className={sheet.suffix}>{unit}</span>}
            </span>
          </label>
        </div>

        {item && (
          <section className={sheet.group} aria-label='Остаток'>
            <SectionCaption>
              Остаток · {formatQuantity(item.quantity)} {item.unit}
            </SectionCaption>
            <div className={sheet.list}>
              <div className={sheet.row}>
                <span className={sheet.rowControl}>
                  <Input
                    variant='plain'
                    aria-label='Приход'
                    inputMode='decimal'
                    placeholder={`Приход, ${unit}`}
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
                  Принять
                </Button>
              </div>
              <div className={sheet.row}>
                <span className={sheet.rowControl}>
                  <Input
                    variant='plain'
                    aria-label='Остаток по факту'
                    inputMode='decimal'
                    placeholder='Остаток по факту'
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
                  Исправить
                </Button>
              </div>
            </div>
          </section>
        )}

        {services.length > 0 && (
          <section className={sheet.group} aria-label='Расход на услугу'>
            <SectionCaption>Расход на одну услугу</SectionCaption>
            <div className={sheet.list}>
              {services.map((service) => (
                <label key={service.id} className={sheet.row}>
                  <span className={sheet.rowLabel}>{service.name}</span>
                  <span className={sheet.rowControl}>
                    <Input
                      variant='plain'
                      aria-label={`Расход: ${service.name}`}
                      inputMode='decimal'
                      placeholder='—'
                      value={amounts[service.id] ?? ''}
                      onValueChange={(value) =>
                        setAmounts((current) => ({ ...current, [service.id]: maskDecimal(value) }))
                      }
                    />
                    {amounts[service.id] && <span className={sheet.suffix}>{unit}</span>}
                  </span>
                </label>
              ))}
            </div>
            <p className={sheet.groupFooter}>
              {example && exampleCost > 0
                ? `«${example.name}» — ${maskAmountInput(String(exampleCost))} сом материалов за визит.`
                : 'Сколько уходит на один визит — спишется, когда визит отмечен «Пришёл».'}
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
            Удалить позицию
          </HoldButton>
        )}
      </form>
    </Sheet>
  )
}
