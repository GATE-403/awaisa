import { Input } from '@awaisa/ui/Input'
import { Select } from '@awaisa/ui/Select'
import { type FormEvent, useState } from 'react'
import { formatPrice, useAvailability } from '@/entities/booking'
import { PersonAvatar } from '@/entities/business'
import type { Catalog, ClientListItem, CreateBookingInput, Specialist } from '@/shared/api/types'
import { NATIONAL_PHONE_DIGITS, PHONE_PLACEHOLDER, REGION } from '@/shared/config/region'
import { useT } from '@/shared/i18n'
import { formatPhone } from '@/shared/lib/formatPhone'
import { maskPhoneInput } from '@/shared/lib/inputMasks'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import styles from './NewBookingDialog.module.css'
import { useClientSuggestions } from './useClientSuggestions'

interface NewBookingDialogProps {
  slug: string
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

const MIN_NAME_QUERY = 2
const MIN_PHONE_QUERY = 3

type ClientField = 'name' | 'phone'

export const NewBookingDialog = ({
  slug,
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
  const t = useT()
  const [specialistId, setSpecialistId] = useState(initialSpecialistId)
  const [chosenServiceId, setServiceId] = useState<string | null>(initial?.serviceId ?? null)
  const [chosenTime, setTime] = useState<string | null>(null)
  const [name, setName] = useState(initial?.name ?? '')
  const [phone, setPhone] = useState(initial ? maskPhoneInput(initial.phone) : '')
  const [comment, setComment] = useState('')
  // The field being typed in: clients who were here before are offered right under it.
  const [typing, setTyping] = useState<ClientField | null>(null)
  const digits = phone.replace(/\D/g, '')
  const localDigits = digits.startsWith(REGION.phone.callingCode)
    ? digits.slice(REGION.phone.callingCode.length)
    : digits
  const query =
    typing === 'name' && name.trim().length >= MIN_NAME_QUERY
      ? name.trim()
      : typing === 'phone' && localDigits.length >= MIN_PHONE_QUERY
        ? localDigits
        : ''
  const suggestions = useClientSuggestions(slug, query)
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
  const isPhoneValid = phone.replace(/\D/g, '').length >= NATIONAL_PHONE_DIGITS
  const canSubmit = Boolean(service && selectedTime && name.trim() && isPhoneValid)
  const timeHint = availability.isLoading
    ? t('Looking for free time…')
    : availability.error
      ? availability.error
      : freeTimes.length === 0
        ? t('The specialist has no free time this day.')
        : service
          ? t('{service}: {duration}, {price}. The client gets a confirmation SMS.', {
              service: service.name,
              duration: t.duration(service.durationMinutes),
              price: formatPrice(service.price),
            })
          : ''

  const pickClient = (client: ClientListItem) => {
    if (client.name) setName(client.name)
    setPhone(maskPhoneInput(client.phone))
    setTyping(null)
  }

  const typeName = (value: string) => {
    setName(value)
    setTyping('name')
  }

  const typePhone = (value: string) => {
    setPhone(maskPhoneInput(value))
    setTyping('phone')
  }

  // Under the row being typed in, like contacts offered while writing a number on a phone.
  const renderSuggestions = (field: ClientField) =>
    typing === field &&
    suggestions.length > 0 && (
      <ul className={styles.suggestions} aria-label={t('Were here before')}>
        {suggestions.map((client) => (
          <li key={client.phone}>
            <button
              type='button'
              className={`${sheet.row} ${styles.suggestion}`}
              onClick={() => pickClient(client)}
            >
              <PersonAvatar name={client.name || client.phone.slice(-2)} size='sm' />
              <span className={styles.suggestionText}>
                <span className={styles.suggestionName}>
                  {client.name || formatPhone(client.phone)}
                </span>
                <span className={styles.suggestionMeta}>
                  {formatPhone(client.phone)}
                  {client.visits > 0 && ` · ${t.count(client.visits, ['visit', 'visits'])}`}
                  {client.noShows > 0 && (
                    <span className={styles.noShows}>
                      {' · '}
                      {t('no-show {count}', {
                        count: t.count(client.noShows, ['time', 'times']),
                      })}
                    </span>
                  )}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    )

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
      title={t('New booking')}
      onClose={onClose}
      action={{ label: t('Add'), form: FORM_ID, disabled: isSubmitting || !canSubmit }}
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className={sheet.form}>
        <section className={sheet.group} aria-label={t('Visit')}>
          <SectionCaption>{dayLabel}</SectionCaption>
          <div className={sheet.list}>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Specialist')}</span>
              <span className={sheet.rowControl}>
                <Select
                  variant='plain'
                  aria-label={t('Specialist')}
                  items={specialists.map(({ id, name: label }) => ({ value: id, label }))}
                  value={specialistId}
                  onValueChange={(value) => value && setSpecialistId(value)}
                />
              </span>
            </div>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Service')}</span>
              <span className={sheet.rowControl}>
                {offered.length > 0 ? (
                  <Select
                    variant='plain'
                    aria-label={t('Service')}
                    items={offered.map(({ id, name: label }) => ({ value: id, label }))}
                    value={service?.id ?? null}
                    onValueChange={(value) => value && setServiceId(value)}
                  />
                ) : (
                  <span className={sheet.rowHint}>{t('No services')}</span>
                )}
              </span>
            </div>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Time')}</span>
              <span className={sheet.rowControl}>
                {freeTimes.length > 0 ? (
                  <Select
                    variant='plain'
                    aria-label={t('Time')}
                    items={freeTimes.map((value) => ({ value, label: value }))}
                    value={selectedTime}
                    onValueChange={(value) => value && setTime(value)}
                  />
                ) : (
                  <span className={sheet.rowHint}>-</span>
                )}
              </span>
            </div>
          </div>
          <p className={sheet.groupFooter} aria-live='polite'>
            {timeHint}
          </p>
        </section>

        <section className={sheet.group} aria-label={t('Client')}>
          <SectionCaption>{t('Client')}</SectionCaption>
          <div className={sheet.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Name')}</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  placeholder={t('Name')}
                  value={name}
                  onValueChange={typeName}
                  maxLength={120}
                  autoComplete='off'
                />
              </span>
            </label>
            {renderSuggestions('name')}
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Phone')}</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  type='tel'
                  inputMode='tel'
                  placeholder={PHONE_PLACEHOLDER}
                  value={phone}
                  onValueChange={typePhone}
                  maxLength={32}
                  autoComplete='off'
                />
              </span>
            </label>
            {renderSuggestions('phone')}
            {/* Several lines: it grows with the words instead of running off the row. */}
            <div className={`${sheet.row} ${sheet.textRow}`}>
              <textarea
                className={styles.comment}
                aria-label={t('Comment')}
                placeholder={t('Comment, if needed')}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                onFocus={() => setTyping(null)}
                maxLength={500}
                rows={1}
              />
            </div>
          </div>
        </section>
      </form>
    </Sheet>
  )
}
