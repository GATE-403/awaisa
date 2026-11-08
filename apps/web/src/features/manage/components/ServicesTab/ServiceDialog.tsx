import { Button } from '@awaisa/ui/Button'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTitle } from '@awaisa/ui/Dialog'
import { Field } from '@awaisa/ui/Field'
import { Input } from '@awaisa/ui/Input'
import { Select } from '@awaisa/ui/Select'
import { Switch } from '@awaisa/ui/Switch'
import { type FormEvent, useState } from 'react'
import type { Category, Service, ServiceInput } from '@/common/api/types'
import { formatDuration } from '@/features/booking/bookingUtils'
import styles from '../manageForms.module.css'

interface ServiceDialogProps {
  service: Service | null
  categories: Category[]
  onClose: () => void
  onSave: (input: ServiceInput) => Promise<boolean>
}

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
  const priceValue = Number(price.replace(/\D/g, ''))
  const isValid = name.trim() !== '' && categoryId !== '' && price.trim() !== ''

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!isValid) return

    setIsSaving(true)
    const saved = await onSave({
      name: name.trim(),
      categoryId,
      durationMinutes,
      price: priceValue,
      description: description.trim(),
      isPopular,
      isActive,
    })
    setIsSaving(false)
    if (saved) onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogTitle>{service ? 'Услуга' : 'Новая услуга'}</DialogTitle>
        <form className={styles.form} onSubmit={handleSubmit}>
          <Field label='Название'>
            <Input value={name} onValueChange={setName} placeholder='Мужская стрижка' autoFocus />
          </Field>
          <div className={styles.pair}>
            <Field label='Длительность'>
              <Select
                aria-label='Длительность'
                items={DURATIONS}
                value={durationMinutes}
                onValueChange={(value) => value && setDuration(value)}
              />
            </Field>
            <Field label='Цена, сом'>
              <Input
                inputMode='numeric'
                value={price}
                onValueChange={(value) => setPrice(value.replace(/\D/g, ''))}
                placeholder='1000'
              />
            </Field>
          </div>
          {categories.length > 1 && (
            <Field label='Категория'>
              <Select
                aria-label='Категория'
                items={categories.map(({ id, name: label }) => ({ value: id, label }))}
                value={categoryId}
                onValueChange={(value) => value && setCategoryId(value)}
              />
            </Field>
          )}
          <Field label='Описание'>
            <Input value={description} onValueChange={setDescription} placeholder='Необязательно' />
          </Field>
          <label className={styles.switchRow}>
            Популярная — покажем первой
            <Switch checked={isPopular} onCheckedChange={setIsPopular} />
          </label>
          <label className={styles.switchRow}>
            Доступна для записи
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </label>
          <DialogFooter>
            <DialogClose render={<Button variant='secondary' />}>Отмена</DialogClose>
            <Button type='submit' disabled={!isValid || isSaving}>
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
