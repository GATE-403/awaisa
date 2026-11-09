import { Button } from '@awaisa/ui/Button'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTitle } from '@awaisa/ui/Dialog'
import { Field } from '@awaisa/ui/Field'
import { Input } from '@awaisa/ui/Input'
import { useToast } from '@awaisa/ui/Toast'
import { type FormEvent, useState } from 'react'
import { getErrorMessage } from '@/common/api/apiError'
import { updateMe } from '@/common/api/clientApi'
import type { Customer } from '@/common/api/types'
import styles from '../ProfilePage.module.css'

interface NameDialogProps {
  name: string
  onClose: () => void
  onSaved: (customer: Customer) => void
}

export const NameDialog = ({ name: initialName, onClose, onSaved }: NameDialogProps) => {
  const toast = useToast()
  const [name, setName] = useState(initialName)
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return

    setIsSaving(true)
    try {
      onSaved(await updateMe(name.trim()))
      toast.show({ title: 'Имя сохранено', type: 'success' })
      onClose()
    } catch (error) {
      toast.show({ title: 'Не сохранилось', description: getErrorMessage(error), type: 'error' })
      setIsSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogTitle>Ваше имя</DialogTitle>
        <form className={styles.dialogForm} onSubmit={handleSubmit}>
          <Field label='Имя' description='Его увидит мастер в расписании'>
            <Input value={name} onValueChange={setName} autoComplete='name' autoFocus />
          </Field>
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
