import { Input } from '@awaisa/ui/Input'
import { useLingui } from '@lingui/react/macro'
import { type FormEvent, useState } from 'react'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'

interface CategoryDialogProps {
  onClose: () => void
  onSave: (name: string) => Promise<boolean>
}

const FORM_ID = 'category-form'

export const CategoryDialog = ({ onClose, onSave }: CategoryDialogProps) => {
  const { t } = useLingui()
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
    <Sheet
      title={t`New category`}
      onClose={onClose}
      action={{ label: t`Add`, form: FORM_ID, disabled: !name.trim() || isSaving }}
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className={sheet.form}>
        <section className={sheet.group} aria-label={t`Category`}>
          <div className={sheet.list}>
            <div className={`${sheet.row} ${sheet.textRow}`}>
              <Input
                variant='plain'
                aria-label={t`Name`}
                placeholder={t`For example, “Nails”`}
                value={name}
                onValueChange={setName}
                autoFocus
              />
            </div>
          </div>
          <p className={sheet.groupFooter}>{t`Categories group services on the business page.`}</p>
        </section>
      </form>
    </Sheet>
  )
}
