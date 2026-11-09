import { Input } from '@awaisa/ui/Input'
import { Switch } from '@awaisa/ui/Switch'
import { Check } from '@phosphor-icons/react/ssr'
import { type FormEvent, useState } from 'react'
import type { Service, Specialist, SpecialistInput } from '@/common/api/types'
import { Sheet } from '@/common/components/Sheet/Sheet'
import sheet from '@/common/components/Sheet/Sheet.module.css'

interface MasterDialogProps {
  master: Specialist | null
  services: Service[]
  onClose: () => void
  onSave: (input: SpecialistInput) => Promise<boolean>
}

const FORM_ID = 'master-form'

export const MasterDialog = ({ master, services, onClose, onSave }: MasterDialogProps) => {
  const [name, setName] = useState(master?.name ?? '')
  const [role, setRole] = useState(master?.role ?? '')
  const [serviceIds, setServiceIds] = useState<string[]>(
    master?.serviceIds ?? services.map((service) => service.id),
  )
  const [isActive, setIsActive] = useState(master?.isActive ?? true)
  const [isSaving, setIsSaving] = useState(false)
  const allSelected = serviceIds.length === services.length

  const toggleService = (id: string, checked: boolean) =>
    setServiceIds((current) => (checked ? [...current, id] : current.filter((item) => item !== id)))

  const toggleAll = () => setServiceIds(allSelected ? [] : services.map((service) => service.id))

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return

    setIsSaving(true)
    const saved = await onSave({ name: name.trim(), role: role.trim(), serviceIds, isActive })
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
        </div>

        {services.length > 0 && (
          <section className={sheet.group} aria-label='Услуги мастера'>
            <div className={sheet.groupHeader}>
              <h3 className={sheet.groupTitle}>Выполняет услуги</h3>
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
          <label className={sheet.row}>
            <span className={sheet.rowLabel}>Принимает записи</span>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </label>
        </div>
      </form>
    </Sheet>
  )
}
