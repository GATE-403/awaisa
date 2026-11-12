'use client'

import { Input } from '@awaisa/ui/Input'
import { Select } from '@awaisa/ui/Select'
import { Switch } from '@awaisa/ui/Switch'
import { Check } from '@phosphor-icons/react/ssr'
import { type FormEvent, useState } from 'react'
import type { Promotion, PromotionInput, PromotionKind, Service } from '@/shared/api/types'
import { SegmentedControl } from '@/shared/ui/SegmentedControl/SegmentedControl'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import styles from './PromotionSheet.module.css'

interface PromotionSheetProps {
  promotion: Promotion | null
  services: Service[]
  onClose: () => void
  onSave: (input: PromotionInput) => Promise<boolean>
  onDelete?: () => void
}

const FORM_ID = 'promotion-form'

const KINDS: { value: PromotionKind; label: string }[] = [
  { value: 'happy_hours', label: 'По часам' },
  { value: 'first_visit', label: 'Новым' },
  { value: 'promo_code', label: 'Промокод' },
]

const DEFAULT_TITLE: Record<PromotionKind, string> = {
  happy_hours: 'Утренние часы',
  first_visit: 'Первый визит',
  promo_code: 'Промокод',
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const TIMES = Array.from({ length: 49 }, (_, index) => index * 30).map((minutes) => ({
  value: minutes,
  label: `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`,
}))

export const PromotionSheet = ({
  promotion,
  services,
  onClose,
  onSave,
  onDelete,
}: PromotionSheetProps) => {
  const [kind, setKind] = useState<PromotionKind>(promotion?.kind ?? 'happy_hours')
  const [title, setTitle] = useState(promotion?.title ?? DEFAULT_TITLE.happy_hours)
  const [percent, setPercent] = useState(String(promotion?.percent ?? 20))
  const [code, setCode] = useState(promotion?.code ?? '')
  const [weekdays, setWeekdays] = useState<number[]>(promotion?.weekdays ?? [0, 1, 2, 3, 4])
  const [fromMinutes, setFromMinutes] = useState(promotion?.fromMinutes ?? 10 * 60)
  const [toMinutes, setToMinutes] = useState(promotion?.toMinutes ?? 12 * 60)
  const [serviceIds, setServiceIds] = useState<string[] | null>(promotion?.serviceIds ?? null)
  const [endsOn, setEndsOn] = useState(promotion?.endsOn ?? '')
  const [isActive, setIsActive] = useState(promotion?.isActive ?? true)
  const [isSaving, setIsSaving] = useState(false)
  const percentValue = Number(percent)
  const isValid =
    title.trim() !== '' &&
    percentValue >= 1 &&
    percentValue <= 90 &&
    (kind !== 'promo_code' || code.trim() !== '') &&
    (kind !== 'happy_hours' || (weekdays.length > 0 && toMinutes > fromMinutes))

  const changeKind = (next: PromotionKind) => {
    // A title the owner has not touched follows the kind.
    if (title === DEFAULT_TITLE[kind]) setTitle(DEFAULT_TITLE[next])
    setKind(next)
  }

  const toggleDay = (day: number) =>
    setWeekdays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort(),
    )

  const toggleService = (id: string, checked: boolean) =>
    setServiceIds((current) => {
      const base = current ?? services.map((service) => service.id)
      const next = checked ? [...new Set([...base, id])] : base.filter((item) => item !== id)
      return next.length === services.length ? null : next
    })

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!isValid) return
    setIsSaving(true)
    const saved = await onSave({
      title: title.trim(),
      kind,
      percent: percentValue,
      code: kind === 'promo_code' ? code.trim().toUpperCase() : null,
      weekdays: kind === 'happy_hours' ? weekdays : null,
      fromMinutes: kind === 'happy_hours' ? fromMinutes : null,
      toMinutes: kind === 'happy_hours' ? toMinutes : null,
      serviceIds,
      startsOn: promotion?.startsOn ?? null,
      endsOn: endsOn || null,
      isActive,
    })
    setIsSaving(false)
    if (saved) onClose()
  }

  return (
    <Sheet
      title={promotion ? 'Акция' : 'Новая акция'}
      onClose={onClose}
      action={{ label: 'Сохранить', form: FORM_ID, disabled: !isValid || isSaving }}
    >
      <form id={FORM_ID} className={sheet.form} onSubmit={handleSubmit}>
        <SegmentedControl label='Тип акции' value={kind} items={KINDS} onChange={changeKind} />

        <section className={sheet.group} aria-label='Скидка'>
          <div className={sheet.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>Название</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  aria-label='Название акции'
                  value={title}
                  onValueChange={setTitle}
                />
              </span>
            </label>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>Скидка</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  aria-label='Скидка, %'
                  inputMode='numeric'
                  value={percent}
                  onValueChange={(value) => setPercent(value.replace(/\D/g, '').slice(0, 2))}
                />
                <span className={sheet.suffix}>%</span>
              </span>
            </label>
            {kind === 'promo_code' && (
              <label className={sheet.row}>
                <span className={sheet.rowLabel}>Промокод</span>
                <span className={sheet.rowControl}>
                  <Input
                    variant='plain'
                    aria-label='Промокод'
                    placeholder='OSEN20'
                    value={code}
                    onValueChange={(value) => setCode(value.toUpperCase().replace(/\s/g, ''))}
                  />
                </span>
              </label>
            )}
          </div>
          <p className={sheet.groupFooter}>
            {kind === 'happy_hours' &&
              'Заполните тихие часы: скидка действует в выбранные дни и время начала визита.'}
            {kind === 'first_visit' &&
              'Для тех, кто записывается к вам впервые — по номеру телефона.'}
            {kind === 'promo_code' &&
              'Клиент вводит код при записи. Раздайте его в Instagram или на визитке.'}
          </p>
        </section>

        {kind === 'happy_hours' && (
          <section className={sheet.group} aria-label='Когда'>
            <h3 className={sheet.groupTitle}>Когда</h3>
            <fieldset className={styles.days}>
              <legend className={styles.legend}>Дни недели</legend>
              {WEEKDAYS.map((day, index) => (
                <button
                  key={day}
                  type='button'
                  className={styles.day}
                  aria-pressed={weekdays.includes(index)}
                  onClick={() => toggleDay(index)}
                >
                  {day}
                </button>
              ))}
            </fieldset>
            <div className={sheet.list}>
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>С</span>
                <span className={sheet.rowControl}>
                  <Select
                    variant='plain'
                    aria-label='Начало'
                    items={TIMES}
                    value={fromMinutes}
                    onValueChange={(value) => value !== null && setFromMinutes(value)}
                  />
                </span>
              </div>
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>До</span>
                <span className={sheet.rowControl}>
                  <Select
                    variant='plain'
                    aria-label='Конец'
                    items={TIMES}
                    value={toMinutes}
                    onValueChange={(value) => value !== null && setToMinutes(value)}
                  />
                </span>
              </div>
            </div>
          </section>
        )}

        <section className={sheet.group} aria-label='Услуги'>
          <div className={sheet.groupHeader}>
            <h3 className={sheet.groupTitle}>Услуги</h3>
            <button type='button' className={sheet.groupLink} onClick={() => setServiceIds(null)}>
              Все
            </button>
          </div>
          <div className={sheet.list}>
            {services.map((service) => (
              <label key={service.id} className={sheet.checkRow}>
                {service.name}
                <input
                  type='checkbox'
                  checked={!serviceIds || serviceIds.includes(service.id)}
                  onChange={(event) => toggleService(service.id, event.target.checked)}
                />
                <Check className={sheet.check} weight='bold' aria-hidden />
              </label>
            ))}
          </div>
        </section>

        <section className={sheet.group} aria-label='Срок'>
          <div className={sheet.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>До даты</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  type='date'
                  aria-label='Действует до'
                  value={endsOn}
                  onValueChange={setEndsOn}
                />
              </span>
            </label>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>Включена</span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </label>
          </div>
          <p className={sheet.groupFooter}>Без даты — пока не выключите.</p>
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
              Удалить акцию
            </button>
          </div>
        )}
      </form>
    </Sheet>
  )
}
