import { Input } from '@awaisa/ui/Input'
import { Select } from '@awaisa/ui/Select'
import { Switch } from '@awaisa/ui/Switch'
import { type FormEvent, useState } from 'react'
import type { Category, Service, ServiceInput } from '@/common/api/types'
import { Sheet } from '@/common/components/Sheet/Sheet'
import sheet from '@/common/components/Sheet/Sheet.module.css'
import { maskAmountInput } from '@/common/utils/inputMasks'
import { formatDuration } from '@/features/booking/bookingUtils'

interface ServiceDialogProps {
  service: Service | null
  categories: Category[]
  onClose: () => void
  onSave: (input: ServiceInput) => Promise<boolean>
}

const FORM_ID = 'service-form'

const DURATIONS = [
  ...Array.from({ length: 16 }, (_, index) => (index + 1) * 15),
  300,
  360,
  480,
].map((minutes) => ({ value: minutes, label: formatDuration(minutes) }))

export const ServiceDialog = ({ service, categories, onClose, onSave }: ServiceDialogProps) => {
  const [name, setName] = useState(service?.name ?? '')
  const [categoryId, setCategoryId] = useState(service?.categoryId ?? categories[0]?.id ?? '')
  const [durationMinutes, setDuration] = useState(service?.durationMinutes ?? 60)
  const [price, setPrice] = useState(service ? String(service.price) : '')
  const [description, setDescription] = useState(service?.description ?? '')
  const [isPopular, setIsPopular] = useState(service?.isPopular ?? false)
  const [isActive, setIsActive] = useState(service?.isActive ?? true)
  const [isSaving, setIsSaving] = useState(false)
  const isValid = name.trim() !== '' && categoryId !== '' && price.trim() !== ''

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!isValid) return

    setIsSaving(true)
    const saved = await onSave({
      name: name.trim(),
      categoryId,
      durationMinutes,
      price: Number(price),
      description: description.trim(),
      isPopular,
      isActive,
    })
    setIsSaving(false)
    if (saved) onClose()
  }

  return (
    <Sheet
      title={service ? 'Услуга' : 'Новая услуга'}
      onClose={onClose}
      action={{ label: 'Сохранить', form: FORM_ID, disabled: !isValid || isSaving }}
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className={sheet.form}>
        <div className={sheet.list}>
          <div className={`${sheet.row} ${sheet.textRow}`}>
            <Input
              variant='plain'
              aria-label='Название'
              placeholder='Название, например «Мужская стрижка»'
              value={name}
              onValueChange={setName}
              autoFocus
            />
          </div>
          <div className={`${sheet.row} ${sheet.textRow}`}>
            <Input
              variant='plain'
              aria-label='Описание'
              placeholder='Что входит — необязательно'
              value={description}
              onValueChange={setDescription}
            />
          </div>
        </div>

        <section className={sheet.group} aria-label='Цена и время'>
          <h3 className={sheet.groupTitle}>Цена и время</h3>
          <div className={sheet.list}>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>Длительность</span>
              <span className={sheet.rowControl}>
                <Select
                  variant='plain'
                  aria-label='Длительность'
                  items={DURATIONS}
                  value={durationMinutes}
                  onValueChange={(value) => value && setDuration(value)}
                />
              </span>
            </div>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>Цена</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  aria-label='Цена, сом'
                  inputMode='numeric'
                  placeholder='0'
                  value={maskAmountInput(price)}
                  onValueChange={(value) => setPrice(value.replace(/\D/g, ''))}
                />
                <span className={sheet.suffix}>сом</span>
              </span>
            </label>
            {categories.length > 1 && (
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>Категория</span>
                <span className={sheet.rowControl}>
                  <Select
                    variant='plain'
                    aria-label='Категория'
                    items={categories.map(({ id, name: label }) => ({ value: id, label }))}
                    value={categoryId}
                    onValueChange={(value) => value && setCategoryId(value)}
                  />
                </span>
              </div>
            )}
          </div>
          <p className={sheet.groupFooter}>Клиент видит цену и длительность до записи.</p>
        </section>

        <section className={sheet.group} aria-label='Показ'>
          <div className={sheet.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>
                Популярная
                <span className={sheet.rowHint}>Покажем первой на странице</span>
              </span>
              <Switch checked={isPopular} onCheckedChange={setIsPopular} />
            </label>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>Доступна для записи</span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </label>
          </div>
        </section>
      </form>
    </Sheet>
  )
}
