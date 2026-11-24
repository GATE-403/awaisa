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
  { value: 0, label: 'Не напоминать' },
  { value: 14, label: 'Через 2 недели' },
  { value: 21, label: 'Через 3 недели' },
  { value: 28, label: 'Через 4 недели' },
  { value: 42, label: 'Через 6 недель' },
  { value: 56, label: 'Через 8 недель' },
  { value: 90, label: 'Через 3 месяца' },
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
      title={service ? t('Услуга') : t('Новая услуга')}
      onClose={onClose}
      action={{ label: t('Сохранить'), form: FORM_ID, disabled: !isValid || isSaving }}
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className={sheet.form}>
        <div className={sheet.list}>
          <div className={`${sheet.row} ${sheet.textRow}`}>
            <Input
              variant='plain'
              aria-label={t('Название')}
              placeholder={t('Название, например «Мужская стрижка»')}
              value={name}
              onValueChange={setName}
              autoFocus
            />
          </div>
          <div className={`${sheet.row} ${sheet.textRow}`}>
            <Input
              variant='plain'
              aria-label={t('Описание')}
              placeholder={t('Что входит - необязательно')}
              value={description}
              onValueChange={setDescription}
            />
          </div>
        </div>

        <section className={sheet.group} aria-label={t('Цена и время')}>
          <SectionCaption>{t('Цена и время')}</SectionCaption>
          <div className={sheet.list}>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Длительность')}</span>
              <span className={sheet.rowControl}>
                <Select
                  variant='plain'
                  aria-label={t('Длительность')}
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
              <span className={sheet.rowLabel}>{t('Цена')}</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  aria-label={t('Цена, сом')}
                  inputMode='numeric'
                  placeholder='0'
                  value={maskAmountInput(price)}
                  onValueChange={(value) => setPrice(value.replace(/\D/g, ''))}
                />
                <span className={sheet.suffix}>{t('сом')}</span>
              </span>
            </label>
            {categories.length > 1 && (
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>{t('Категория')}</span>
                <span className={sheet.rowControl}>
                  <Select
                    variant='plain'
                    aria-label={t('Категория')}
                    items={categories.map(({ id, name: label }) => ({ value: id, label }))}
                    value={categoryId}
                    onValueChange={(value) => value && setCategoryId(value)}
                  />
                </span>
              </div>
            )}
          </div>
          <p className={sheet.groupFooter}>{t('Клиент видит цену и длительность до записи.')}</p>
        </section>

        <section className={sheet.group} aria-label={t('Пора прийти снова')}>
          <SectionCaption>{t('Пора прийти снова')}</SectionCaption>
          <div className={sheet.list}>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Напомнить по SMS')}</span>
              <span className={sheet.rowControl}>
                <Select
                  variant='plain'
                  aria-label={t('Напомнить прийти снова')}
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
                  'Клиенту придёт одно SMS со ссылкой к тому же мастеру, если он ещё не записался сам.',
                )
              : t('Напомним клиенту записаться снова - к тому же мастеру.')}
          </p>
        </section>

        {canTakeDeposits && (
          <section className={sheet.group} aria-label={t('Предоплата')}>
            <SectionCaption>{t('Предоплата')}</SectionCaption>
            <div className={sheet.list}>
              <label className={sheet.row}>
                <span className={sheet.rowLabel}>{t('При записи онлайн')}</span>
                <span className={sheet.rowControl}>
                  <Input
                    variant='plain'
                    aria-label={t('Предоплата, сом')}
                    inputMode='numeric'
                    placeholder={t('нет')}
                    value={maskAmountInput(deposit)}
                    onValueChange={(value) => setDeposit(value.replace(/\D/g, ''))}
                  />
                  <span className={sheet.suffix}>{t('сом')}</span>
                </span>
              </label>
            </div>
            <p className={sheet.groupFooter}>
              {!isDepositValid
                ? t('Предоплата не может быть больше цены.')
                : depositAmount > 0
                  ? t(
                      'Клиент оплатит {amount} картой, иначе через 15 минут время освободится. Вернём, если отменит за сутки; при поздней отмене останется у вас.',
                      { amount: formatPrice(depositAmount) },
                    )
                  : t('Защищает от неявок на долгие услуги: клиент платит часть при записи.')}
            </p>
          </section>
        )}

        <section className={sheet.group} aria-label={t('Показ')}>
          <div className={sheet.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>
                {t('Популярная')}
                <span className={sheet.rowHint}>{t('Покажем первой на странице')}</span>
              </span>
              <Switch checked={isPopular} onCheckedChange={setIsPopular} />
            </label>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Доступна для записи')}</span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </label>
          </div>
        </section>
      </form>
    </Sheet>
  )
}
