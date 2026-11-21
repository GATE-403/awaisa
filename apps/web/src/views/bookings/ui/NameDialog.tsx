'use client'

import { Button } from '@awaisa/ui/Button'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTitle } from '@awaisa/ui/Dialog'
import { Field } from '@awaisa/ui/Field'
import { Input } from '@awaisa/ui/Input'
import { useToast } from '@awaisa/ui/Toast'
import { type FormEvent, useState } from 'react'
import { getErrorMessage } from '@/shared/api/apiError'
import { updateMe } from '@/shared/api/clientApi'
import type { Customer } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import styles from './NameDialog.module.css'

interface NameDialogProps {
  name: string
  onClose: () => void
  onSaved: (customer: Customer) => void
}

export const NameDialog = ({ name: initialName, onClose, onSaved }: NameDialogProps) => {
  const t = useT()
  const toast = useToast()
  const [name, setName] = useState(initialName)
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return

    setIsSaving(true)
    try {
      onSaved(await updateMe(name.trim()))
      toast.show({ title: t('Имя сохранено'), type: 'success' })
      onClose()
    } catch (error) {
      toast.show({ title: t('Не сохранилось'), description: getErrorMessage(error), type: 'error' })
      setIsSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogTitle>{t('Ваше имя')}</DialogTitle>
        <form className={styles.dialogForm} onSubmit={handleSubmit}>
          <Field label={t('Имя')} description={t('Его увидит мастер в расписании')}>
            <Input value={name} onValueChange={setName} autoComplete='name' autoFocus />
          </Field>
          <DialogFooter>
            <DialogClose render={<Button variant='secondary' />}>{t('Отмена')}</DialogClose>
            <Button type='submit' disabled={!name.trim() || isSaving}>
              {t('Сохранить')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
