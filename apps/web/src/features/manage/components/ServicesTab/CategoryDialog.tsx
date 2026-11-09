import { Input } from '@awaisa/ui/Input'
import { type FormEvent, useState } from 'react'
import { Sheet } from '@/common/components/Sheet/Sheet'
import sheet from '@/common/components/Sheet/Sheet.module.css'

interface CategoryDialogProps {
  onClose: () => void
  onSave: (name: string) => Promise<boolean>
}

const FORM_ID = 'category-form'

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
    <Sheet
      title='Новая категория'
      onClose={onClose}
      action={{ label: 'Добавить', form: FORM_ID, disabled: !name.trim() || isSaving }}
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className={sheet.form}>
        <section className={sheet.group} aria-label='Категория'>
          <div className={sheet.list}>
            <div className={`${sheet.row} ${sheet.textRow}`}>
              <Input
                variant='plain'
                aria-label='Название'
                placeholder='Например, «Ногти»'
                value={name}
                onValueChange={setName}
                autoFocus
              />
            </div>
          </div>
          <p className={sheet.groupFooter}>Категории группируют услуги на странице бизнеса.</p>
        </section>
      </form>
    </Sheet>
  )
}
