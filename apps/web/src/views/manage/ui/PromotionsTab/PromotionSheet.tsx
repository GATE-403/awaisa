'use client'

import { Input } from '@awaisa/ui/Input'
import { Select } from '@awaisa/ui/Select'
import { Switch } from '@awaisa/ui/Switch'
import type { MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { Check } from '@phosphor-icons/react/ssr'
import { type FormEvent, useState } from 'react'
import type { Promotion, PromotionInput, PromotionKind, Service } from '@/shared/api/types'
import { DateField } from '@/shared/ui/DateField/DateField'
import { HoldButton } from '@/shared/ui/HoldButton/HoldButton'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { SegmentedControl } from '@/shared/ui/SegmentedControl/SegmentedControl'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import styles from './PromotionSheet.module.css'

interface PromotionSheetProps {
  promotion: Promotion | null
  /** A new promotion's starting values (analytics' quiet hour: weekday and hours). */
  draft?: Partial<PromotionInput>
  services: Service[]
  onClose: () => void
  onSave: (input: PromotionInput) => Promise<boolean>
  onDelete?: () => void
}

const FORM_ID = 'promotion-form'

const KINDS: { value: PromotionKind; label: MessageDescriptor }[] = [
  { value: 'happy_hours', label: msg`By hours` },
  { value: 'first_visit', label: msg`New clients` },
  { value: 'promo_code', label: msg`Promo code` },
]

const DEFAULT_TITLE: Record<PromotionKind, string> = {
  happy_hours: 'Morning hours',
  first_visit: 'First visit',
  promo_code: 'Promo code',
}

// 0 = Monday, the API's numbering.
const WEEKDAYS = [
  { key: 'mon', label: msg`Mon` },
  { key: 'tue', label: msg`Tue` },
  { key: 'wed', label: msg`Wed` },
  { key: 'thu', label: msg`Thu` },
  { key: 'fri', label: msg`Fri` },
  { key: 'sat', label: msg`Sat` },
  { key: 'sun', label: msg`Sun` },
]

const TIMES = Array.from({ length: 49 }, (_, index) => index * 30).map((minutes) => ({
  value: minutes,
  label: `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`,
}))

export const PromotionSheet = ({
  promotion,
  draft,
  services,
  onClose,
  onSave,
  onDelete,
}: PromotionSheetProps) => {
  const { t } = useLingui()
  const [kind, setKind] = useState<PromotionKind>(promotion?.kind ?? draft?.kind ?? 'happy_hours')
  const [title, setTitle] = useState(promotion?.title ?? draft?.title ?? DEFAULT_TITLE.happy_hours)
  const [percent, setPercent] = useState(String(promotion?.percent ?? 20))
  const [code, setCode] = useState(promotion?.code ?? '')
  const [weekdays, setWeekdays] = useState<number[]>(
    promotion?.weekdays ?? draft?.weekdays ?? [0, 1, 2, 3, 4],
  )
  const [fromMinutes, setFromMinutes] = useState(
    promotion?.fromMinutes ?? draft?.fromMinutes ?? 10 * 60,
  )
  const [toMinutes, setToMinutes] = useState(promotion?.toMinutes ?? draft?.toMinutes ?? 12 * 60)
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
      title={promotion ? t`Promotion` : t`New promotion`}
      onClose={onClose}
      action={{ label: t`Save`, form: FORM_ID, disabled: !isValid || isSaving }}
    >
      <form id={FORM_ID} className={sheet.form} onSubmit={handleSubmit}>
        <SegmentedControl
          label={t`Promotion type`}
          value={kind}
          items={KINDS.map((item) => ({ ...item, label: t(item.label) }))}
          onChange={changeKind}
        />

        <section className={sheet.group} aria-label={t`Discount`}>
          <div className={sheet.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>
                {t({ message: 'Name', context: 'name of a thing, not a person' })}
              </span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  aria-label={t`Promotion name`}
                  value={title}
                  onValueChange={setTitle}
                />
              </span>
            </label>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>{t`Discount`}</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  aria-label={t`Discount, %`}
                  inputMode='numeric'
                  value={percent}
                  onValueChange={(value) => setPercent(value.replace(/\D/g, '').slice(0, 2))}
                />
                <span className={sheet.suffix}>%</span>
              </span>
            </label>
            {kind === 'promo_code' && (
              <label className={sheet.row}>
                <span className={sheet.rowLabel}>{t`Promo code`}</span>
                <span className={sheet.rowControl}>
                  <Input
                    variant='plain'
                    aria-label={t`Promo code`}
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
              t`Fill quiet hours: the discount applies on the chosen days by the visit’s start time.`}
            {kind === 'first_visit' &&
              t`For people booking with you for the first time, by phone number.`}
            {kind === 'promo_code' &&
              t`The client enters the code when booking. Share it on Instagram or a business card.`}
          </p>
        </section>

        {kind === 'happy_hours' && (
          <section className={sheet.group} aria-label={t`When`}>
            <SectionCaption>{t`When`}</SectionCaption>
            <fieldset className={styles.days}>
              <legend className={styles.legend}>{t`Days of the week`}</legend>
              {WEEKDAYS.map((day, index) => (
                <button
                  key={day.key}
                  type='button'
                  className={styles.day}
                  aria-pressed={weekdays.includes(index)}
                  onClick={() => toggleDay(index)}
                >
                  {t(day.label)}
                </button>
              ))}
            </fieldset>
            <div className={sheet.list}>
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>{t`From`}</span>
                <span className={sheet.rowControl}>
                  <Select
                    variant='plain'
                    aria-label={t`Start`}
                    items={TIMES}
                    value={fromMinutes}
                    onValueChange={(value) => value !== null && setFromMinutes(value)}
                  />
                </span>
              </div>
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>{t`Until`}</span>
                <span className={sheet.rowControl}>
                  <Select
                    variant='plain'
                    aria-label={t`End`}
                    items={TIMES}
                    value={toMinutes}
                    onValueChange={(value) => value !== null && setToMinutes(value)}
                  />
                </span>
              </div>
            </div>
          </section>
        )}

        <section className={sheet.group} aria-label={t`Services`}>
          <div className={sheet.groupHeader}>
            <SectionCaption isInset={false}>{t`Services`}</SectionCaption>
            <button type='button' className={sheet.groupLink} onClick={() => setServiceIds(null)}>
              {t`All`}
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
                <Check className={sheet.check} aria-hidden />
              </label>
            ))}
          </div>
        </section>

        <section className={sheet.group} aria-label={t`Term`}>
          <div className={sheet.list}>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>{t`Until date`}</span>
              <span className={sheet.rowControl}>
                <DateField
                  label={t`Valid until`}
                  placeholder={t`No end date`}
                  value={endsOn}
                  onChange={setEndsOn}
                  isClearable
                />
              </span>
            </div>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>{t`On`}</span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </label>
          </div>
          <p className={sheet.groupFooter}>{t`Without a date: until you turn it off.`}</p>
        </section>

        {onDelete && (
          <HoldButton
            onConfirm={() => {
              onDelete()
              onClose()
            }}
          >
            {t`Delete promotion`}
          </HoldButton>
        )}
      </form>
    </Sheet>
  )
}
