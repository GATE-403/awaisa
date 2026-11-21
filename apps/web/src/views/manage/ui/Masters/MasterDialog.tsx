import { Input } from '@awaisa/ui/Input'
import { Select } from '@awaisa/ui/Select'
import { Switch } from '@awaisa/ui/Switch'
import { Check } from '@phosphor-icons/react/ssr'
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react'
import { PersonAvatar } from '@/entities/business'
import { getMasterPay } from '@/shared/api/clientApi'
import type { Branch, Service, Specialist, SpecialistInput } from '@/shared/api/types'
import { maskPhoneInput } from '@/shared/lib/inputMasks'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import { describePayScheme } from '@/views/manage/lib/payText'
import payStyles from './MasterPaySheet.module.css'

interface MasterDialogProps {
  master: Specialist | null
  services: Service[]
  branches: Branch[]
  onClose: () => void
  onSave: (input: SpecialistInput) => Promise<boolean>
  /** Only for saved masters: uploads happen at once, like changing a contact photo. */
  onPhotoChange?: (file: File | null) => Promise<boolean>
  /** Only for saved masters: opens their week and days away. */
  onOpenSchedule?: () => void
  /** Only for saved masters, owners only: opens «Зарплата» (the row reads the scheme from `slug`). */
  onOpenPay?: () => void
  slug?: string
}

const FORM_ID = 'master-form'

export const MasterDialog = ({
  master,
  services,
  branches,
  onClose,
  onSave,
  onPhotoChange,
  onOpenSchedule,
  onOpenPay,
  slug,
}: MasterDialogProps) => {
  const [branchId, setBranchId] = useState<string | null>(master?.branchId ?? null)
  const fileInput = useRef<HTMLInputElement>(null)
  const [photoUrl, setPhotoUrl] = useState(master?.photoUrl ?? null)
  const [isUploading, setIsUploading] = useState(false)
  const [name, setName] = useState(master?.name ?? '')
  const [role, setRole] = useState(master?.role ?? '')
  const [phone, setPhone] = useState(master?.phone ? maskPhoneInput(master.phone) : '')
  const [paySummary, setPaySummary] = useState<string | null>(null)
  const [serviceIds, setServiceIds] = useState<string[]>(
    master?.serviceIds ?? services.map((service) => service.id),
  )
  const [isActive, setIsActive] = useState(master?.isActive ?? true)
  const [isSaving, setIsSaving] = useState(false)
  const allSelected = serviceIds.length === services.length

  const masterId = master?.id
  const canOpenPay = Boolean(onOpenPay)
  useEffect(() => {
    if (!canOpenPay || !slug || !masterId) return
    const controller = new AbortController()
    getMasterPay(slug, masterId, controller.signal)
      .then((scheme) => setPaySummary(describePayScheme(scheme)))
      // The row still opens the sheet, which says what went wrong.
      .catch(() => undefined)
    return () => controller.abort()
  }, [canOpenPay, slug, masterId])

  const toggleService = (id: string, checked: boolean) =>
    setServiceIds((current) => (checked ? [...current, id] : current.filter((item) => item !== id)))

  const toggleAll = () => setServiceIds(allSelected ? [] : services.map((service) => service.id))

  const changePhoto = async (file: File | null) => {
    if (!onPhotoChange) return
    setIsUploading(true)
    if (file) setPhotoUrl(URL.createObjectURL(file))
    const saved = await onPhotoChange(file)
    if (saved && !file) setPhotoUrl(null)
    if (!saved) setPhotoUrl(master?.photoUrl ?? null)
    setIsUploading(false)
  }

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void changePhoto(file)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return

    setIsSaving(true)
    const saved = await onSave({
      name: name.trim(),
      role: role.trim(),
      serviceIds,
      isActive,
      branchId,
      phone: phone.trim(),
    })
    setIsSaving(false)
    if (saved) onClose()
  }

  return (
    <Sheet
      title={master ? 'Мастер' : 'Новый мастер'}
      onClose={onClose}
      action={{ label: 'Сохранить', form: FORM_ID, disabled: !name.trim() || isSaving }}
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className={sheet.form}>
        <div className={sheet.photoHeader}>
          <PersonAvatar name={name || '?'} src={photoUrl ?? undefined} size='xl' />
          {onPhotoChange ? (
            <span className={sheet.photoActions}>
              <button
                type='button'
                className={sheet.photoButton}
                onClick={() => fileInput.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? 'Загружаем…' : photoUrl ? 'Изменить фото' : 'Добавить фото'}
              </button>
              {photoUrl && !isUploading && (
                <button
                  type='button'
                  className={sheet.photoButton}
                  onClick={() => void changePhoto(null)}
                >
                  Удалить
                </button>
              )}
              <input
                ref={fileInput}
                type='file'
                accept='image/jpeg,image/png,image/webp,image/heic,image/heif'
                hidden
                onChange={handleFile}
                aria-label='Фото мастера'
              />
            </span>
          ) : (
            <span className={sheet.photoHint}>Фото добавите после сохранения</span>
          )}
        </div>
        <div className={sheet.list}>
          <div className={`${sheet.row} ${sheet.textRow}`}>
            <Input
              variant='plain'
              aria-label='Имя'
              placeholder='Имя и фамилия'
              value={name}
              onValueChange={setName}
              autoFocus
            />
          </div>
          <div className={`${sheet.row} ${sheet.textRow}`}>
            <Input
              variant='plain'
              aria-label='Должность'
              placeholder='Должность, например «Стилист»'
              value={role}
              onValueChange={setRole}
            />
          </div>
          <label className={sheet.row}>
            <span className={sheet.rowLabel}>Телефон для входа</span>
            <Input
              variant='plain'
              type='tel'
              inputMode='tel'
              aria-label='Телефон для входа'
              placeholder='+996 …'
              value={phone}
              onValueChange={(value) => setPhone(maskPhoneInput(value))}
            />
          </label>
          {branches.length > 1 && (
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>Филиал</span>
              <span className={sheet.rowControl}>
                <Select
                  variant='plain'
                  aria-label='Филиал'
                  items={[
                    { value: 'all', label: 'Все филиалы' },
                    ...branches.map(({ id, name: label }) => ({ value: id, label })),
                  ]}
                  value={branchId ?? 'all'}
                  onValueChange={(value) => setBranchId(!value || value === 'all' ? null : value)}
                />
              </span>
            </div>
          )}
        </div>

        {services.length > 0 && (
          <section className={sheet.group} aria-label='Услуги мастера'>
            <div className={sheet.groupHeader}>
              <SectionCaption isInset={false}>Выполняет услуги</SectionCaption>
              <button type='button' className={sheet.groupLink} onClick={toggleAll}>
                {allSelected ? 'Снять все' : 'Выбрать все'}
              </button>
            </div>
            <div className={sheet.list}>
              {services.map((service) => (
                <label key={service.id} className={sheet.checkRow}>
                  {service.name}
                  <input
                    type='checkbox'
                    checked={serviceIds.includes(service.id)}
                    onChange={(event) => toggleService(service.id, event.target.checked)}
                  />
                  <Check className={sheet.check} weight='bold' aria-hidden />
                </label>
              ))}
            </div>
            <p className={sheet.groupFooter}>
              Отмечено {serviceIds.length} из {services.length}. Клиент сможет выбрать мастера
              только для этих услуг.
            </p>
          </section>
        )}

        <div className={sheet.list}>
          {onOpenPay && (
            <button type='button' className={sheet.row} onClick={onOpenPay}>
              <span className={sheet.rowLabel}>Зарплата</span>
              <span className={sheet.rowControl}>
                <span className={payStyles.summary}>{paySummary ?? ''}</span>
                <span className={sheet.suffix}>›</span>
              </span>
            </button>
          )}
          {onOpenSchedule && (
            <button type='button' className={sheet.row} onClick={onOpenSchedule}>
              <span className={sheet.rowLabel}>График и отпуск</span>
              <span className={sheet.suffix}>›</span>
            </button>
          )}
          <label className={sheet.row}>
            <span className={sheet.rowLabel}>Принимает записи</span>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </label>
        </div>
      </form>
    </Sheet>
  )
}
