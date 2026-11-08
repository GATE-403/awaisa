import { Button } from '@awaisa/ui/Button'
import { Checkbox } from '@awaisa/ui/Checkbox'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTitle } from '@awaisa/ui/Dialog'
import { Field } from '@awaisa/ui/Field'
import { Input } from '@awaisa/ui/Input'
import { Switch } from '@awaisa/ui/Switch'
import { type FormEvent, useState } from 'react'
import type { Service, Specialist, SpecialistInput } from '@/common/api/types'
import styles from '../manageForms.module.css'

interface MasterDialogProps {
  master: Specialist | null
  services: Service[]
  onClose: () => void
  onSave: (input: SpecialistInput) => Promise<boolean>
}

export const MasterDialog = ({ master, services, onClose, onSave }: MasterDialogProps) => {
  const [name, setName] = useState(master?.name ?? '')
  const [role, setRole] = useState(master?.role ?? '')
  const [serviceIds, setServiceIds] = useState<string[]>(
    master?.serviceIds ?? services.map((service) => service.id),
  )
  const [isActive, setIsActive] = useState(master?.isActive ?? true)
  const [isSaving, setIsSaving] = useState(false)

  const toggleService = (id: string, checked: boolean) =>
    setServiceIds((current) => (checked ? [...current, id] : current.filter((item) => item !== id)))

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return

    setIsSaving(true)
    const saved = await onSave({ name: name.trim(), role: role.trim(), serviceIds, isActive })
    setIsSaving(false)
    if (saved) onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogTitle>{master ? 'Мастер' : 'Новый мастер'}</DialogTitle>
        <form className={styles.form} onSubmit={handleSubmit}>
          <Field label='Имя'>
            <Input value={name} onValueChange={setName} placeholder='Айгерим' autoFocus />
          </Field>
          <Field label='Должность'>
            <Input value={role} onValueChange={setRole} placeholder='Стилист' />
          </Field>
          {services.length > 0 && (
            <fieldset className={styles.section}>
              <legend className={styles.groupTitle}>Выполняет услуги</legend>
              <div className={styles.checks}>
                {services.map((service) => (
                  <label key={service.id} className={styles.check}>
                    <Checkbox
                      checked={serviceIds.includes(service.id)}
                      onCheckedChange={(checked) => toggleService(service.id, checked)}
                    />
                    {service.name}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <label className={styles.switchRow}>
            Принимает записи
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </label>
          <DialogFooter>
            <DialogClose render={<Button variant='secondary' />}>Отмена</DialogClose>
            <Button type='submit' disabled={!name.trim() || isSaving}>
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
