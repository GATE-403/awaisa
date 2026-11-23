'use client'

import { Input } from '@awaisa/ui/Input'
import { useToast } from '@awaisa/ui/Toast'
import { type FormEvent, useState } from 'react'
import { getErrorMessage } from '@/shared/api/apiError'
import { updateMe } from '@/shared/api/clientApi'
import type { Customer } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'

interface NameDialogProps {
  name: string
  onClose: () => void
  onSaved: (customer: Customer) => void
}

const FORM_ID = 'name-form'

// The name is edited in a form sheet like everything else in the settings: «Отмена · Ваше имя ·
// Сохранить» over one Settings row. A sheet also meets the phone's keyboard itself (the Android
// app keeps the WebView whole), where the centred dialog it was made the app resize the page.
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
    <Sheet
      title={t('Ваше имя')}
      onClose={onClose}
      action={{ label: t('Сохранить'), form: FORM_ID, disabled: !name.trim() || isSaving }}
    >
      <form id={FORM_ID} className={sheet.group} onSubmit={handleSubmit}>
        <div className={sheet.list}>
          <label className={sheet.row}>
            <span className={sheet.rowLabel}>{t('Имя')}</span>
            <span className={sheet.rowControl}>
              <Input
                variant='plain'
                aria-label={t('Имя')}
                value={name}
                onValueChange={setName}
                autoComplete='name'
                autoFocus
              />
            </span>
          </label>
        </div>
        <p className={sheet.groupFooter}>{t('Его увидит мастер в расписании')}</p>
      </form>
    </Sheet>
  )
}
