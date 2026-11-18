import { Input } from '@awaisa/ui/Input'
import { Select } from '@awaisa/ui/Select'
import { type FormEvent, useState } from 'react'
import { formatDuration, formatPrice, useAvailability } from '@/entities/booking'
import type { Catalog, CreateBookingInput, Specialist } from '@/shared/api/types'
import { maskPhoneInput } from '@/shared/lib/inputMasks'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'

interface NewBookingDialogProps {
  date: string
  dayLabel: string
  time: string | null
  specialistId: string
  specialists: Pick<Specialist, 'id' | 'name'>[]
  catalog: Catalog
  onClose: () => void
  onSubmit: (input: CreateBookingInput) => Promise<boolean>
  /** Prefill, e.g. a client from the waitlist. */
  initial?: { serviceId: string | null; name: string; phone: string }
}

const FORM_ID = 'new-booking-form'

const MIN_PHONE_DIGITS = 9

export const NewBookingDialog = ({
  date,
  dayLabel,
  time,
  specialistId: initialSpecialistId,
  specialists,
  catalog,
  onClose,
  onSubmit,
  initial,
}: NewBookingDialogProps) => {
  const [specialistId, setSpecialistId] = useState(initialSpecialistId)
  const [chosenServiceId, setServiceId] = useState<string | null>(initial?.serviceId ?? null)
  const [chosenTime, setTime] = useState<string | null>(null)
  const [name, setName] = useState(initial?.name ?? '')
  const [phone, setPhone] = useState(initial ? maskPhoneInput(initial.phone) : '')
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const offered = catalog.services.filter(
    (service) =>
      service.isActive !== false &&
      catalog.specialists.some(
        (specialist) =>
          specialist.id === specialistId && specialist.serviceIds.includes(service.id),
      ),
  )
  const service =
    offered.find((item) => item.id === chosenServiceId) ??
    offered.find((item) => item.isPopular) ??
    offered[0] ??
    null
  const availability = useAvailability(service?.id ?? null, specialistId, date)
  const freeTimes = availability.slots.filter((slot) => slot.isAvailable).map((slot) => slot.time)
  // The tapped time if it is free, otherwise the next free one after it.
  const selectedTime =
    (chosenTime && freeTimes.includes(chosenTime) ? chosenTime : null) ??
    freeTimes.find((item) => time === null || item >= time) ??
    freeTimes[0] ??
    null
  const isPhoneValid = phone.replace(/\D/g, '').length >= MIN_PHONE_DIGITS
  const canSubmit = Boolean(service && selectedTime && name.trim() && isPhoneValid)
  const timeHint = availability.isLoading
    ? 'Ищем свободное время…'
    : availability.error
      ? availability.error
      : freeTimes.length === 0
        ? 'У мастера нет свободного времени в этот день.'
        : service
          ? `${service.name}: ${formatDuration(service.durationMinutes)}, ${formatPrice(service.price)}. Клиенту придёт SMS с подтверждением.`
          : ''

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit || !service || !selectedTime || isSubmitting) return

    setIsSubmitting(true)
    const saved = await onSubmit({
      serviceId: service.id,
      specialistId,
      date,
      time: selectedTime,
      name: name.trim(),
      phone: phone.trim(),
      comment: comment.trim(),
    })
    setIsSubmitting(false)
    if (saved) onClose()
  }

  return (
    <Sheet
      title='Новая запись'
      onClose={onClose}
      action={{ label: 'Добавить', form: FORM_ID, disabled: isSubmitting || !canSubmit }}
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className={sheet.form}>
        <section className={sheet.group} aria-label='Визит'>
          <SectionCaption>{dayLabel}</SectionCaption>
          <div className={sheet.list}>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>Мастер</span>
              <span className={sheet.rowControl}>
                <Select
                  variant='plain'
                  aria-label='Мастер'
                  items={specialists.map(({ id, name: label }) => ({ value: id, label }))}
                  value={specialistId}
                  onValueChange={(value) => value && setSpecialistId(value)}
                />
              </span>
            </div>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>Услуга</span>
              <span className={sheet.rowControl}>
                {offered.length > 0 ? (
                  <Select
                    variant='plain'
                    aria-label='Услуга'
                    items={offered.map(({ id, name: label }) => ({ value: id, label }))}
                    value={service?.id ?? null}
                    onValueChange={(value) => value && setServiceId(value)}
                  />
                ) : (
                  <span className={sheet.rowHint}>Нет услуг</span>
                )}
              </span>
            </div>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>Время</span>
              <span className={sheet.rowControl}>
                {freeTimes.length > 0 ? (
                  <Select
                    variant='plain'
                    aria-label='Время'
                    items={freeTimes.map((value) => ({ value, label: value }))}
                    value={selectedTime}
                    onValueChange={(value) => value && setTime(value)}
                  />
                ) : (
                  <span className={sheet.rowHint}>—</span>
                )}
              </span>
            </div>
          </div>
          <p className={sheet.groupFooter} aria-live='polite'>
            {timeHint}
          </p>
        </section>

        <section className={sheet.group} aria-label='Клиент'>
          <SectionCaption>Клиент</SectionCaption>
          <div className={sheet.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>Имя</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  placeholder='Как зовут'
                  value={name}
                  onValueChange={setName}
                  maxLength={120}
                  autoComplete='off'
                />
              </span>
            </label>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>Телефон</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  type='tel'
                  inputMode='tel'
                  placeholder='+996 555 123 456'
                  value={phone}
                  onValueChange={(value) => setPhone(maskPhoneInput(value))}
                  maxLength={32}
                  autoComplete='off'
                />
              </span>
            </label>
            <div className={`${sheet.row} ${sheet.textRow}`}>
              <Input
                variant='plain'
                aria-label='Комментарий'
                placeholder='Комментарий — необязательно'
                value={comment}
                onValueChange={setComment}
                maxLength={500}
              />
            </div>
          </div>
        </section>
      </form>
    </Sheet>
  )
}
