import { Input } from '@awaisa/ui/Input'
import { Switch } from '@awaisa/ui/Switch'
import dynamic from 'next/dynamic'
import { type FormEvent, useState } from 'react'
import type { Branch, BranchInput } from '@/shared/api/types'
import { maskPhoneInput } from '@/shared/lib/inputMasks'
import { HoldButton } from '@/shared/ui/HoldButton/HoldButton'
import type { Point } from '@/shared/ui/MapView/MapView'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'

// Leaflet needs the browser.
const LocationPicker = dynamic(
  () => import('@/shared/ui/MapView/LocationPicker').then((module) => module.LocationPicker),
  { ssr: false },
)

interface BranchDialogProps {
  branch: Branch | null
  canDelete: boolean
  onClose: () => void
  onSave: (input: BranchInput) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
}

const FORM_ID = 'branch-form'

export const BranchDialog = ({
  branch,
  canDelete,
  onClose,
  onSave,
  onDelete,
}: BranchDialogProps) => {
  const [name, setName] = useState(branch?.name ?? '')
  const [address, setAddress] = useState(branch?.address ?? '')
  const [phone, setPhone] = useState(branch?.phone ?? '')
  const [isActive, setIsActive] = useState(branch?.isActive ?? true)
  const [point, setPoint] = useState<Point | null>(
    branch?.latitude != null && branch.longitude != null
      ? { latitude: branch.latitude, longitude: branch.longitude }
      : null,
  )
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return

    setIsSaving(true)
    const saved = await onSave({
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      isActive,
      latitude: point?.latitude ?? null,
      longitude: point?.longitude ?? null,
    })
    setIsSaving(false)
    if (saved) onClose()
  }

  const handleDelete = async () => {
    if (!branch) return
    if (await onDelete(branch.id)) onClose()
  }

  return (
    <Sheet
      title={branch ? 'Филиал' : 'Новый филиал'}
      onClose={onClose}
      action={{ label: 'Сохранить', form: FORM_ID, disabled: !name.trim() || isSaving }}
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className={sheet.form}>
        <div className={sheet.list}>
          <label className={sheet.row}>
            <span className={sheet.rowLabel}>Название</span>
            <span className={sheet.rowControl}>
              <Input
                variant='plain'
                placeholder='Центр, Джал, Асанбай'
                value={name}
                onValueChange={setName}
                maxLength={120}
                autoFocus={!branch}
              />
            </span>
          </label>
          <label className={sheet.row}>
            <span className={sheet.rowLabel}>Адрес</span>
            <span className={sheet.rowControl}>
              <Input
                variant='plain'
                placeholder='ул. Токтогула, 125'
                value={address}
                onValueChange={setAddress}
                maxLength={200}
                autoComplete='street-address'
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
                placeholder='Как у бизнеса'
                value={phone}
                onValueChange={(value) => setPhone(maskPhoneInput(value))}
              />
            </span>
          </label>
        </div>

        <section className={sheet.group} aria-label='Метка на карте'>
          <SectionCaption>Метка на карте</SectionCaption>
          <LocationPicker value={point} onChange={setPoint} />
          <p className={sheet.groupFooter}>
            {point
              ? 'Передвиньте карту, чтобы метка указала на вход.'
              : 'Передвиньте карту к вашему адресу — так клиенты найдут вас рядом.'}
          </p>
        </section>

        <div className={sheet.list}>
          <label className={sheet.row}>
            <span className={sheet.rowLabel}>Принимает клиентов</span>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </label>
        </div>

        {branch && canDelete && <HoldButton onConfirm={handleDelete}>Удалить филиал</HoldButton>}
      </form>
    </Sheet>
  )
}
