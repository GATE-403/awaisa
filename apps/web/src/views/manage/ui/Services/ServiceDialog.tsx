import { Input } from '@awaisa/ui/Input'
import { Select } from '@awaisa/ui/Select'
import { Switch } from '@awaisa/ui/Switch'
import { type FormEvent, useEffect, useState } from 'react'
import { formatPrice } from '@/entities/booking'
import { getPaymentConfig } from '@/shared/api/clientApi'
import type { Category, Service, ServiceInput } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { maskAmountInput } from '@/shared/lib/inputMasks'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import { useHasFeature } from '@/views/manage/model/usePlanAccess'

interface ServiceDialogProps {
  service: Service | null
  categories: Category[]
  onClose: () => void
  onSave: (input: ServiceInput) => Promise<boolean>
}

const FORM_ID = 'service-form'

const REBOOK_OPTIONS = [
  { value: 0, label: 'No reminder' },
  { value: 14, label: 'In 2 weeks' },
  { value: 21, label: 'In 3 weeks' },
  { value: 28, label: 'In 4 weeks' },
  { value: 42, label: 'In 6 weeks' },
  { value: 56, label: 'In 8 weeks' },
  { value: 90, label: 'In 3 months' },
]

const DURATIONS = [...Array.from({ length: 16 }, (_, index) => (index + 1) * 15), 300, 360, 480]

export const ServiceDialog = ({ service, categories, onClose, onSave }: ServiceDialogProps) => {
  const t = useT()
  const [name, setName] = useState(service?.name ?? '')
  const [categoryId, setCategoryId] = useState(service?.categoryId ?? categories[0]?.id ?? '')
  const [durationMinutes, setDuration] = useState(service?.durationMinutes ?? 60)
  const [price, setPrice] = useState(service ? String(service.price) : '')
  const [rebookDays, setRebookDays] = useState<number | null>(service?.rebookDays ?? null)
  const [deposit, setDeposit] = useState(service?.deposit ? String(service.deposit) : '')
  const [isPaymentOn, setIsPaymentOn] = useState(false)
  const hasDeposits = useHasFeature('deposits')
  const canTakeDeposits = isPaymentOn && hasDeposits
  const [description, setDescription] = useState(service?.description ?? '')
  const [isPopular, setIsPopular] = useState(service?.isPopular ?? false)
  const [isActive, setIsActive] = useState(service?.isActive ?? true)
  const [isSaving, setIsSaving] = useState(false)
  const depositAmount = Number(deposit) || 0
  const isDepositValid =
    depositAmount === 0 || price.trim() === '' || depositAmount <= Number(price)
  const isValid = name.trim() !== '' && categoryId !== '' && price.trim() !== '' && isDepositValid

  // The deposit field appears only when the platform has an acquirer to take the money.
  useEffect(() => {
    const controller = new AbortController()
    getPaymentConfig(controller.signal)
      .then((config) => setIsPaymentOn(config.isAvailable))
      .catch(() => undefined)
    return () => controller.abort()
  }, [])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!isValid) return

    setIsSaving(true)
    const saved = await onSave({
      name: name.trim(),
      categoryId,
      durationMinutes,
      price: Number(price),
      deposit: depositAmount > 0 ? depositAmount : null,
      rebookDays,
      description: description.trim(),
      isPopular,
      isActive,
    })
    setIsSaving(false)
    if (saved) onClose()
  }

  return (
    <Sheet
      title={service ? t('Service') : t('New service')}
      onClose={onClose}
      action={{ label: t('Save'), form: FORM_ID, disabled: !isValid || isSaving }}
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className={sheet.form}>
        <div className={sheet.list}>
          <div className={`${sheet.row} ${sheet.textRow}`}>
            <Input
              variant='plain'
              aria-label={t('Name')}
              placeholder={t('Name, for example “Men’s haircut”')}
              value={name}
              onValueChange={setName}
              autoFocus
            />
          </div>
          <div className={`${sheet.row} ${sheet.textRow}`}>
            <Input
              variant='plain'
              aria-label={t('Description')}
              placeholder={t('What is included (optional)')}
              value={description}
              onValueChange={setDescription}
            />
          </div>
        </div>

        <section className={sheet.group} aria-label={t('Price and time')}>
          <SectionCaption>{t('Price and time')}</SectionCaption>
          <div className={sheet.list}>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Duration')}</span>
              <span className={sheet.rowControl}>
                <Select
                  variant='plain'
                  aria-label={t('Duration')}
                  items={DURATIONS.map((minutes) => ({
                    value: minutes,
                    label: t.duration(minutes),
                  }))}
                  value={durationMinutes}
                  onValueChange={(value) => value && setDuration(value)}
                />
              </span>
            </div>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Price')}</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  aria-label={t('Price, som')}
                  inputMode='numeric'
                  placeholder='0'
                  value={maskAmountInput(price)}
                  onValueChange={(value) => setPrice(value.replace(/\D/g, ''))}
                />
                <span className={sheet.suffix}>{t('som')}</span>
              </span>
            </label>
            {categories.length > 1 && (
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>{t('Category')}</span>
                <span className={sheet.rowControl}>
                  <Select
                    variant='plain'
                    aria-label={t('Category')}
                    items={categories.map(({ id, name: label }) => ({ value: id, label }))}
                    value={categoryId}
                    onValueChange={(value) => value && setCategoryId(value)}
                  />
                </span>
              </div>
            )}
          </div>
          <p className={sheet.groupFooter}>
            {t('Clients see the price and duration before booking.')}
          </p>
        </section>

        <section className={sheet.group} aria-label={t('Time to come again')}>
          <SectionCaption>{t('Time to come again')}</SectionCaption>
          <div className={sheet.list}>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Remind by SMS')}</span>
              <span className={sheet.rowControl}>
                <Select
                  variant='plain'
                  aria-label={t('Remind to come again')}
                  items={REBOOK_OPTIONS.map((option) => ({ ...option, label: t(option.label) }))}
                  value={rebookDays ?? 0}
                  onValueChange={(value) => setRebookDays(value ? value : null)}
                />
              </span>
            </div>
          </div>
          <p className={sheet.groupFooter}>
            {rebookDays
              ? t(
                  'The client gets one SMS with a link to the same specialist, unless they have booked already.',
                )
              : t('We remind the client to book again with the same specialist.')}
          </p>
        </section>

        {canTakeDeposits && (
          <section className={sheet.group} aria-label={t('Deposit')}>
            <SectionCaption>{t('Deposit')}</SectionCaption>
            <div className={sheet.list}>
              <label className={sheet.row}>
                <span className={sheet.rowLabel}>{t('When booking online')}</span>
                <span className={sheet.rowControl}>
                  <Input
                    variant='plain'
                    aria-label={t('Deposit, som')}
                    inputMode='numeric'
                    placeholder={t('none')}
                    value={maskAmountInput(deposit)}
                    onValueChange={(value) => setDeposit(value.replace(/\D/g, ''))}
                  />
                  <span className={sheet.suffix}>{t('som')}</span>
                </span>
              </label>
            </div>
            <p className={sheet.groupFooter}>
              {!isDepositValid
                ? t('The deposit cannot be more than the price.')
                : depositAmount > 0
                  ? t(
                      'The client pays {amount} by card, or the time is freed after 15 minutes. Refunded if cancelled a day ahead; kept by you if cancelled later.',
                      { amount: formatPrice(depositAmount) },
                    )
                  : t('Protects long services from no-shows: the client pays part when booking.')}
            </p>
          </section>
        )}

        <section className={sheet.group} aria-label={t('Display')}>
          <div className={sheet.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>
                {t('Popular')}
                <span className={sheet.rowHint}>{t('Shown first on the page')}</span>
              </span>
              <Switch checked={isPopular} onCheckedChange={setIsPopular} />
            </label>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Open for booking')}</span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </label>
          </div>
        </section>
      </form>
    </Sheet>
  )
}
