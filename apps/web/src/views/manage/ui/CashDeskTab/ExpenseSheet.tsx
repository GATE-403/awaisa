'use client'

import { Input } from '@awaisa/ui/Input'
import { Select } from '@awaisa/ui/Select'
import { type FormEvent, useState } from 'react'
import type { Branch, Expense, ExpenseInput } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { maskAmountInput } from '@/shared/lib/inputMasks'
import { DateField } from '@/shared/ui/DateField/DateField'
import { HoldButton } from '@/shared/ui/HoldButton/HoldButton'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import { EXPENSE_CATEGORIES } from '@/views/manage/lib/cashFormat'

interface ExpenseSheetProps {
  expense: Expense | null
  /** The business's own categories, beside the presets. */
  customCategories: string[]
  branches: Branch[]
  today: string
  onClose: () => void
  onSave: (input: ExpenseInput) => Promise<boolean>
  onDelete?: () => void
}

const FORM_ID = 'expense-form'
const CUSTOM = '__custom'

// An expense: what it was for, how much, when and at which branch. A category the owner types
// becomes one of theirs and is offered next time.
export const ExpenseSheet = ({
  expense,
  customCategories,
  branches,
  today,
  onClose,
  onSave,
  onDelete,
}: ExpenseSheetProps) => {
  const t = useT()
  const categories = [
    ...EXPENSE_CATEGORIES.map((item) => ({ ...item, label: t(item.label) })),
    ...customCategories.map((category) => ({ value: category, label: category })),
    { value: CUSTOM, label: t('Своя статья…') },
  ]
  const [category, setCategory] = useState(expense?.category ?? 'rent')
  const [customCategory, setCustomCategory] = useState('')
  const [amount, setAmount] = useState(expense ? String(Math.round(expense.amount)) : '')
  const [date, setDate] = useState(expense?.date ?? today)
  const [branchId, setBranchId] = useState(expense?.branchId ?? '')
  const [note, setNote] = useState(expense?.note ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const chosen = category === CUSTOM ? customCategory.trim() : category
  const value = Number(amount.replace(/\D/g, '') || 0)
  const isValid = chosen !== '' && value > 0 && date !== ''

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!isValid) return
    setIsSaving(true)
    const isSaved = await onSave({
      category: chosen,
      amount: value,
      date,
      branchId: branchId || null,
      note: note.trim() || null,
    })
    setIsSaving(false)
    if (isSaved) onClose()
  }

  return (
    <Sheet
      title={t(expense ? 'Расход' : 'Новый расход')}
      onClose={onClose}
      action={{ label: t('Сохранить'), form: FORM_ID, disabled: !isValid || isSaving }}
    >
      <form id={FORM_ID} className={sheet.form} onSubmit={handleSubmit}>
        <div className={sheet.list}>
          <div className={sheet.row}>
            <span className={sheet.rowLabel}>{t('Статья')}</span>
            <span className={sheet.rowControl}>
              <Select
                variant='plain'
                aria-label={t('Статья расхода')}
                items={categories}
                value={category}
                onValueChange={(next) => next && setCategory(next)}
              />
            </span>
          </div>
          {category === CUSTOM && (
            <div className={`${sheet.row} ${sheet.textRow}`}>
              <Input
                variant='plain'
                aria-label={t('Своя статья')}
                placeholder={t('Например, «Уборка»')}
                autoFocus
                maxLength={40}
                value={customCategory}
                onValueChange={setCustomCategory}
              />
            </div>
          )}
          <label className={sheet.row}>
            <span className={sheet.rowLabel}>{t('Сумма')}</span>
            <span className={sheet.rowControl}>
              <Input
                variant='plain'
                aria-label={t('Сумма, сом')}
                inputMode='numeric'
                placeholder='0'
                autoFocus={!expense && category !== CUSTOM}
                value={maskAmountInput(amount.replace(/\D/g, ''))}
                onValueChange={setAmount}
              />
              <span className={sheet.suffix}>{t('сом')}</span>
            </span>
          </label>
          <div className={sheet.row}>
            <span className={sheet.rowLabel}>{t('Дата')}</span>
            <span className={sheet.rowControl}>
              <DateField label={t('Дата расхода')} value={date} onChange={setDate} max={today} />
            </span>
          </div>
          {branches.length > 1 && (
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Филиал')}</span>
              <span className={sheet.rowControl}>
                <Select
                  variant='plain'
                  aria-label={t('Филиал')}
                  items={[
                    { value: '', label: t('Весь бизнес') },
                    ...branches.map((branch) => ({ value: branch.id, label: branch.name })),
                  ]}
                  value={branchId}
                  onValueChange={(next) => setBranchId(next ?? '')}
                />
              </span>
            </div>
          )}
          <div className={`${sheet.row} ${sheet.textRow}`}>
            <Input
              variant='plain'
              aria-label={t('Комментарий')}
              placeholder={t('Комментарий')}
              maxLength={240}
              value={note}
              onValueChange={setNote}
            />
          </div>
        </div>
        {expense?.isFromStock && (
          <p className={sheet.groupFooter}>{t('Записан из прихода на склад.')}</p>
        )}

        {onDelete && (
          <HoldButton
            onConfirm={() => {
              onDelete()
              onClose()
            }}
          >
            {t('Удалить расход')}
          </HoldButton>
        )}
      </form>
    </Sheet>
  )
}
