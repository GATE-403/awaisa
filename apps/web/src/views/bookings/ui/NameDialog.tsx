'use client'

import { Input } from '@awaisa/ui/Input'
import { useToast } from '@awaisa/ui/Toast'
import { useLingui } from '@lingui/react/macro'
import { type FormEvent, useState } from 'react'
import { getErrorMessage } from '@/shared/api/apiError'
import { updateMe } from '@/shared/api/clientApi'
import type { Customer } from '@/shared/api/types'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'

interface NameDialogProps {
  name: string
  onClose: () => void
  onSaved: (customer: Customer) => void
}

const FORM_ID = 'name-form'

// The name is edited in a form sheet like everything else in the settings: «Cancel · Your name ·
// Save» over one Settings row. A sheet also meets the phone's keyboard itself (the Android
// app keeps the WebView whole), where the centred dialog it was made the app resize the page.
export const NameDialog = ({ name: initialName, onClose, onSaved }: NameDialogProps) => {
  const { t } = useLingui()
  const toast = useToast()
  const [name, setName] = useState(initialName)
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return

    setIsSaving(true)
    try {
      onSaved(await updateMe(name.trim()))
      toast.show({ title: t`Name saved`, type: 'success' })
      onClose()
    } catch (error) {
      toast.show({ title: t`Not saved`, description: getErrorMessage(error), type: 'error' })
      setIsSaving(false)
    }
  }

  return (
    <Sheet
      title={t`Your name`}
      onClose={onClose}
      action={{ label: t`Save`, form: FORM_ID, disabled: !name.trim() || isSaving }}
    >
      <form id={FORM_ID} className={sheet.group} onSubmit={handleSubmit}>
        <div className={sheet.list}>
          <label className={sheet.row}>
            <span className={sheet.rowLabel}>{t`Name`}</span>
            <span className={sheet.rowControl}>
              <Input
                variant='plain'
                aria-label={t`Name`}
                value={name}
                onValueChange={setName}
                autoComplete='name'
                autoFocus
              />
            </span>
          </label>
        </div>
        <p className={sheet.groupFooter}>{t`The specialist sees it in the schedule`}</p>
      </form>
    </Sheet>
  )
}
