'use client'

import { Select } from '@awaisa/ui/Select'
import { Switch } from '@awaisa/ui/Switch'
import { useState } from 'react'
import type { Service, Specialist, WorkPhoto, WorkPhotoInput } from '@/shared/api/types'
import { HoldButton } from '@/shared/ui/HoldButton/HoldButton'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import styles from './PhotosSection.module.css'

interface WorkPhotoSheetProps {
  photo: WorkPhoto
  services: Service[]
  specialists: Specialist[]
  onClose: () => void
  onSave: (input: WorkPhotoInput) => Promise<boolean>
  onDelete: () => void
  /** Several photos just uploaded, tagged in turn: «Фото 1 из 3», «Далее» until the last. */
  step?: { index: number; total: number }
  /** Puts the photo first in «Работы» (the first five lead the page); absent when it is first. */
  onMakeFirst?: () => void
}

const NONE = 'none'

// What the photo shows: with a service (and master) it books exactly that from the «Работы» feed.
export const WorkPhotoSheet = ({
  photo,
  services,
  specialists,
  onClose,
  onSave,
  onDelete,
  step,
  onMakeFirst,
}: WorkPhotoSheetProps) => {
  const isLastStep = !step || step.index >= step.total
  const [serviceId, setServiceId] = useState(photo.serviceId ?? NONE)
  const [specialistId, setSpecialistId] = useState(photo.specialistId ?? NONE)
  const [isShown, setIsShown] = useState(!photo.isHidden)
  const [isSaving, setIsSaving] = useState(false)
  const masters = specialists.filter(
    (specialist) => serviceId === NONE || specialist.serviceIds.includes(serviceId),
  )

  const save = async () => {
    setIsSaving(true)
    const saved = await onSave({
      serviceId: serviceId === NONE ? null : serviceId,
      specialistId: specialistId === NONE ? null : specialistId,
      isHidden: !isShown,
    })
    setIsSaving(false)
    if (saved) onClose()
  }

  return (
    <Sheet
      title={step ? `Фото ${step.index} из ${step.total}` : 'Фото работы'}
      onClose={onClose}
      action={{
        label: isLastStep ? 'Готово' : 'Далее',
        onClick: () => void save(),
        disabled: isSaving,
      }}
    >
      <div className={sheet.form}>
        {/* biome-ignore lint/performance/noImgElement: already resized WebP from our API */}
        <img src={photo.url} alt='Фото работы' className={styles.preview} />
        <section className={sheet.group} aria-label='Что на фото'>
          <div className={sheet.list}>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>Услуга</span>
              <span className={sheet.rowControl}>
                <Select
                  variant='plain'
                  aria-label='Услуга на фото'
                  items={[
                    { value: NONE, label: 'Не указана' },
                    ...services.map((service) => ({ value: service.id, label: service.name })),
                  ]}
                  value={serviceId}
                  onValueChange={(value) => {
                    const next = value ?? NONE
                    setServiceId(next)
                    const master = specialists.find((item) => item.id === specialistId)
                    if (master && next !== NONE && !master.serviceIds.includes(next)) {
                      setSpecialistId(NONE)
                    }
                  }}
                />
              </span>
            </div>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>Мастер</span>
              <span className={sheet.rowControl}>
                <Select
                  variant='plain'
                  aria-label='Мастер на фото'
                  items={[
                    { value: NONE, label: 'Любой' },
                    ...masters.map((master) => ({ value: master.id, label: master.name })),
                  ]}
                  value={specialistId}
                  onValueChange={(value) => setSpecialistId(value ?? NONE)}
                />
              </span>
            </div>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>Показывать клиентам</span>
              <Switch checked={isShown} onCheckedChange={setIsShown} />
            </label>
            {onMakeFirst && (
              <button
                type='button'
                className={`${sheet.row} ${styles.rowAction}`}
                onClick={onMakeFirst}
              >
                Поставить первой
              </button>
            )}
          </div>
          <p className={sheet.groupFooter}>
            {photo.reports > 0 && photo.isHidden
              ? `Скрыто после жалоб (${photo.reports}). Включите, если с фото всё в порядке.`
              : serviceId === NONE
                ? 'Укажите услугу — в ленте «Работы» под фото появится «Записаться» на неё.'
                : 'В ленте «Работы» под фото будет цена, ближайшее время и «Записаться».'}
          </p>
        </section>
        <HoldButton
          onConfirm={() => {
            onDelete()
            onClose()
          }}
        >
          Удалить фото
        </HoldButton>
      </div>
    </Sheet>
  )
}
