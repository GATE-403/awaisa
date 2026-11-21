'use client'

import { Input } from '@awaisa/ui/Input'
import { type FormEvent, useState } from 'react'
import { formatPrice } from '@/entities/booking'
import type { CashShift } from '@/shared/api/types'
import { maskAmountInput } from '@/shared/lib/inputMasks'
import { SegmentedControl } from '@/shared/ui/SegmentedControl/SegmentedControl'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import styles from './CashDeskTab.module.css'

type ShiftSheetMode = 'open' | 'move' | 'close'

interface ShiftSheetProps {
  mode: ShiftSheetMode
  shift: CashShift | null
  branchName?: string
  onClose: () => void
  onOpen: (openingCash: number) => Promise<boolean>
  onMove: (kind: 'in' | 'out', amount: number, reason: string) => Promise<boolean>
  onCloseShift: (countedCash: number, note: string | null) => Promise<boolean>
}

const FORM_ID = 'shift-form'

const MOVES: { value: 'in' | 'out'; label: string }[] = [
  { value: 'in', label: 'Внести' },
  { value: 'out', label: 'Изъять' },
]

const TITLES: Record<ShiftSheetMode, string> = {
  open: 'Открыть смену',
  move: 'Деньги в кассе',
  close: 'Закрыть смену',
}

const ACTIONS: Record<ShiftSheetMode, string> = {
  open: 'Открыть',
  move: 'Записать',
  close: 'Закрыть',
}

const toAmount = (value: string) => Number(value.replace(/\D/g, '') || 0)

// What the difference at closing means, in words: a shortage, a surplus or a match.
const describeDifference = (difference: number) => {
  if (difference === 0) return { text: 'Сходится с ожидаемым.', tone: undefined }
  const amount = formatPrice(Math.abs(difference))
  return difference < 0
    ? { text: `Недостача ${amount}.`, tone: 'danger' as const }
    : { text: `Излишек ${amount}.`, tone: 'success' as const }
}

// One sheet for the till: open a shift with the counted cash, put cash in or take it out with
// a reason, close it with the counted cash against what is expected.
export const ShiftSheet = ({
  mode,
  shift,
  branchName,
  onClose,
  onOpen,
  onMove,
  onCloseShift,
}: ShiftSheetProps) => {
  const [amount, setAmount] = useState('')
  const [kind, setKind] = useState<'in' | 'out'>('out')
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const value = toAmount(amount)
  const isValid = mode === 'move' ? value > 0 && reason.trim() !== '' : amount !== ''
  const difference = shift && amount !== '' ? value - shift.expectedCash : null

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!isValid) return
    setIsSaving(true)
    const isDone =
      mode === 'open'
        ? await onOpen(value)
        : mode === 'move'
          ? await onMove(kind, value, reason.trim())
          : await onCloseShift(value, note.trim() || null)
    setIsSaving(false)
    if (isDone) onClose()
  }

  // The shift's cash, line by line, so a difference can be traced; zero lines are left out.
  const summary = shift
    ? [
        { label: 'В начале смены', amount: shift.openingCash, isShown: true },
        { label: 'Наличные за визиты', amount: shift.visitsCash, isShown: shift.visitsCash > 0 },
        { label: 'Наличные за товары', amount: shift.salesCash, isShown: shift.salesCash > 0 },
        { label: 'Внесено', amount: shift.cashIn, isShown: shift.cashIn > 0 },
        { label: 'Изъято', amount: -shift.cashOut, isShown: shift.cashOut > 0 },
      ].filter((line) => line.isShown)
    : []

  return (
    <Sheet
      title={TITLES[mode]}
      onClose={onClose}
      action={{ label: ACTIONS[mode], form: FORM_ID, disabled: !isValid || isSaving }}
    >
      <form id={FORM_ID} className={sheet.form} onSubmit={handleSubmit}>
        {mode === 'move' && (
          <div className={styles.segment}>
            <SegmentedControl label='Что сделать' value={kind} items={MOVES} onChange={setKind} />
          </div>
        )}

        {mode === 'close' && shift && (
          <section className={sheet.group} aria-label='Ожидается'>
            <div className={sheet.list}>
              {summary.map((line) => (
                <div key={line.label} className={sheet.row}>
                  <span className={sheet.rowLabel}>{line.label}</span>
                  <span className={styles.value}>
                    {line.amount < 0 ? '−' : ''}
                    {formatPrice(Math.abs(line.amount))}
                  </span>
                </div>
              ))}
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>Должно быть в кассе</span>
                <span className={styles.value} data-strong>
                  {formatPrice(shift.expectedCash)}
                </span>
              </div>
            </div>
          </section>
        )}

        <section className={sheet.group} aria-label='Сумма'>
          <div className={sheet.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>
                {mode === 'move' ? 'Сумма' : mode === 'open' ? 'В кассе сейчас' : 'Пересчитано'}
              </span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  aria-label={mode === 'close' ? 'Пересчитано наличных, сом' : 'Сумма, сом'}
                  inputMode='numeric'
                  placeholder='0'
                  autoFocus
                  value={maskAmountInput(amount.replace(/\D/g, ''))}
                  onValueChange={setAmount}
                />
                <span className={sheet.suffix}>сом</span>
              </span>
            </label>
            {mode === 'move' && (
              <div className={`${sheet.row} ${sheet.textRow}`}>
                <Input
                  variant='plain'
                  aria-label='Причина'
                  placeholder={kind === 'out' ? 'Например, «Вода и кофе»' : 'Например, «Размен»'}
                  value={reason}
                  onValueChange={setReason}
                  maxLength={160}
                />
              </div>
            )}
            {mode === 'close' && (
              <div className={`${sheet.row} ${sheet.textRow}`}>
                <Input
                  variant='plain'
                  aria-label='Комментарий'
                  placeholder='Комментарий, если нужно'
                  value={note}
                  onValueChange={setNote}
                  maxLength={240}
                />
              </div>
            )}
          </div>
          <p
            className={`${sheet.groupFooter} ${styles.footer}`}
            data-tone={difference === null ? undefined : describeDifference(difference).tone}
          >
            {mode === 'open' &&
              `Пересчитайте наличные${branchName ? ` в кассе «${branchName}»` : ''}: от этой суммы считается остаток.`}
            {mode === 'move' &&
              (kind === 'out'
                ? 'Изъятие уменьшает ожидаемый остаток. Расходы бизнеса записывайте в «Расходы».'
                : 'Например, размен в начале дня.')}
            {mode === 'close' &&
              (difference === null
                ? 'Пересчитайте наличные: покажем расхождение.'
                : describeDifference(difference).text)}
          </p>
        </section>
      </form>
    </Sheet>
  )
}
