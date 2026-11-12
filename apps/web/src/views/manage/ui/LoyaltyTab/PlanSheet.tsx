'use client'

import { Input } from '@awaisa/ui/Input'
import { Select } from '@awaisa/ui/Select'
import { Switch } from '@awaisa/ui/Switch'
import { type FormEvent, useState } from 'react'
import type { Service, SubscriptionPlan, SubscriptionPlanInput } from '@/shared/api/types'
import { maskAmountInput } from '@/shared/lib/inputMasks'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'

interface PlanSheetProps {
  plan: SubscriptionPlan | null
  services: Service[]
  onClose: () => void
  onSave: (input: SubscriptionPlanInput) => Promise<boolean>
  onDelete?: () => void
}

const FORM_ID = 'plan-form'

const VALIDITY = [30, 60, 90, 180, 365].map((days) => ({
  value: days,
  label: days === 365 ? 'Год' : `${days} дней`,
}))

export const PlanSheet = ({ plan, services, onClose, onSave, onDelete }: PlanSheetProps) => {
  const [title, setTitle] = useState(plan?.title ?? '')
  const [serviceId, setServiceId] = useState<string>(plan?.serviceId ?? 'any')
  const [visits, setVisits] = useState(String(plan?.visits ?? 5))
  const [price, setPrice] = useState(plan ? String(plan.price) : '')
  const [validDays, setValidDays] = useState(plan?.validDays ?? 90)
  const [isActive, setIsActive] = useState(plan?.isActive ?? true)
  const [isSaving, setIsSaving] = useState(false)
  const isValid = title.trim() !== '' && Number(visits) >= 1 && price !== ''
  const service = services.find((item) => item.id === serviceId)
  const fullPrice = service ? service.price * Number(visits || 0) : null

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!isValid) return
    setIsSaving(true)
    const saved = await onSave({
      title: title.trim(),
      serviceId: serviceId === 'any' ? null : serviceId,
      visits: Number(visits),
      price: Number(price),
      validDays,
      isActive,
    })
    setIsSaving(false)
    if (saved) onClose()
  }

  return (
    <Sheet
      title={plan ? 'Абонемент' : 'Новый абонемент'}
      onClose={onClose}
      action={{ label: 'Сохранить', form: FORM_ID, disabled: !isValid || isSaving }}
    >
      <form id={FORM_ID} className={sheet.form} onSubmit={handleSubmit}>
        <section className={sheet.group} aria-label='Абонемент'>
          <div className={sheet.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>Название</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  aria-label='Название абонемента'
                  placeholder='5 стрижек за 4'
                  value={title}
                  onValueChange={setTitle}
                />
              </span>
            </label>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>Услуга</span>
              <span className={sheet.rowControl}>
                <Select
                  variant='plain'
                  aria-label='Услуга абонемента'
                  items={[
                    { value: 'any', label: 'Любая' },
                    ...services.map((item) => ({ value: item.id, label: item.name })),
                  ]}
                  value={serviceId}
                  onValueChange={(value) => value && setServiceId(value)}
                />
              </span>
            </div>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>Визитов</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  aria-label='Визитов'
                  inputMode='numeric'
                  value={visits}
                  onValueChange={(value) => setVisits(value.replace(/\D/g, '').slice(0, 3))}
                />
              </span>
            </label>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>Цена</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  aria-label='Цена абонемента, сом'
                  inputMode='numeric'
                  placeholder='0'
                  value={maskAmountInput(price)}
                  onValueChange={(value) => setPrice(value.replace(/\D/g, ''))}
                />
                <span className={sheet.suffix}>сом</span>
              </span>
            </label>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>Действует</span>
              <span className={sheet.rowControl}>
                <Select
                  variant='plain'
                  aria-label='Срок действия'
                  items={VALIDITY}
                  value={validDays}
                  onValueChange={(value) => value && setValidDays(value)}
                />
              </span>
            </div>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>Продаётся</span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </label>
          </div>
          {fullPrice !== null && price !== '' && Number(price) < fullPrice && (
            <p className={sheet.groupFooter}>
              По отдельности {Number(visits)} визитов стоят {fullPrice.toLocaleString('ru-RU')} сом
              — клиент экономит {(fullPrice - Number(price)).toLocaleString('ru-RU')} сом.
            </p>
          )}
        </section>
        {onDelete && (
          <div className={sheet.list}>
            <button
              type='button'
              className={sheet.danger}
              onClick={() => {
                onDelete()
                onClose()
              }}
            >
              Удалить абонемент
            </button>
          </div>
        )}
      </form>
    </Sheet>
  )
}
