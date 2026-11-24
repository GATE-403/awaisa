'use client'

import { Select } from '@awaisa/ui/Select'
import { Switch } from '@awaisa/ui/Switch'
import { useState } from 'react'
import type { Service, Specialist, WorkPhoto, WorkPhotoInput } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
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
  /** Several photos just uploaded, tagged in turn: "Photo 1 of 3", "Next" until the last. */
  step?: { index: number; total: number }
  /** Puts the photo first in "Work" (the first five lead the page); absent when it is first. */
  onMakeFirst?: () => void
}

const NONE = 'none'

// What the photo shows: with a service (and master) it books exactly that from the "Work" feed.
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
  const t = useT()
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
      title={
        step
          ? t('Photo {index} of {total}', { index: step.index, total: step.total })
          : t('Work photo')
      }
      onClose={onClose}
      action={{
        label: isLastStep ? t('Done') : t('Next'),
        onClick: () => void save(),
        disabled: isSaving,
      }}
    >
      <div className={sheet.form}>
        {/* biome-ignore lint/performance/noImgElement: already resized WebP from our API */}
        <img src={photo.url} alt={t('Work photo')} className={styles.preview} />
        <section className={sheet.group} aria-label={t('What is in the photo')}>
          <div className={sheet.list}>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Service')}</span>
              <span className={sheet.rowControl}>
                <Select
                  variant='plain'
                  aria-label={t('Service in the photo')}
                  items={[
                    { value: NONE, label: t('Not set') },
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
              <span className={sheet.rowLabel}>{t('Specialist')}</span>
              <span className={sheet.rowControl}>
                <Select
                  variant='plain'
                  aria-label={t('Specialist in the photo')}
                  items={[
                    { value: NONE, label: t('Any') },
                    ...masters.map((master) => ({ value: master.id, label: master.name })),
                  ]}
                  value={specialistId}
                  onValueChange={(value) => setSpecialistId(value ?? NONE)}
                />
              </span>
            </div>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Show to clients')}</span>
              <Switch checked={isShown} onCheckedChange={setIsShown} />
            </label>
            {onMakeFirst && (
              <button
                type='button'
                className={`${sheet.row} ${styles.rowAction}`}
                onClick={onMakeFirst}
              >
                {t('Put first')}
              </button>
            )}
          </div>
          <p className={sheet.groupFooter}>
            {photo.reports > 0 && photo.isHidden
              ? t('Hidden after reports ({count}). Turn it on if the photo is fine.', {
                  count: photo.reports,
                })
              : serviceId === NONE
                ? t('Set the service: in the "Work" feed the photo gets "Book" for it.')
                : t('In the "Work" feed the photo shows the price, the next free time and "Book".')}
          </p>
        </section>
        <HoldButton
          onConfirm={() => {
            onDelete()
            onClose()
          }}
        >
          {t('Delete photo')}
        </HoldButton>
      </div>
    </Sheet>
  )
}
