import { Button } from '@awaisa/ui/Button'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTitle } from '@awaisa/ui/Dialog'
import { Field } from '@awaisa/ui/Field'
import { Input } from '@awaisa/ui/Input'
import { type FormEvent, useState } from 'react'
import styles from '../manageForms.module.css'

interface CategoryDialogProps {
  onClose: () => void
  onSave: (name: string) => Promise<boolean>
}

export const CategoryDialog = ({ onClose, onSave }: CategoryDialogProps) => {
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return

    setIsSaving(true)
    const saved = await onSave(name.trim())
    setIsSaving(false)
    if (saved) onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogTitle>Новая категория</DialogTitle>
        <form className={styles.form} onSubmit={handleSubmit}>
          <Field label='Название'>
            <Input value={name} onValueChange={setName} placeholder='Например, «Ногти»' autoFocus />
          </Field>
          <DialogFooter>
            <DialogClose render={<Button variant='secondary' />}>Отмена</DialogClose>
            <Button type='submit' disabled={!name.trim() || isSaving}>
              Добавить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
