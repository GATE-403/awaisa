import { Button } from '@awaisa/ui/Button'
import { Field } from '@awaisa/ui/Field'
import { Input } from '@awaisa/ui/Input'
import { Select } from '@awaisa/ui/Select'
import { Switch } from '@awaisa/ui/Switch'
import { type FormEvent, useState } from 'react'
import { updateBusiness } from '@/common/api/clientApi'
import type { Business, BusinessKind, UpdateBusinessInput } from '@/common/api/types'
import { BUSINESS_KINDS } from '@/constants/platform'
import styles from '../manageForms.module.css'

interface ProfileTabProps {
  slug: string
  business: Business
  run: (action: () => Promise<unknown>, successTitle: string) => Promise<boolean>
}

type TextField = 'name' | 'description' | 'city' | 'address' | 'phone' | 'whatsapp' | 'mapUrl'

const FIELDS: { key: TextField; label: string; placeholder?: string; type?: string }[] = [
  { key: 'name', label: 'Название' },
  { key: 'description', label: 'Коротко о вас', placeholder: 'Стрижки и уход для мужчин' },
  { key: 'city', label: 'Город' },
  { key: 'address', label: 'Адрес', placeholder: 'ул. Токтогула, 125' },
  { key: 'phone', label: 'Телефон', type: 'tel' },
  { key: 'whatsapp', label: 'WhatsApp', type: 'tel', placeholder: 'Необязательно' },
  { key: 'mapUrl', label: 'Ссылка на карту', placeholder: 'https://2gis.kg/…' },
]

export const ProfileTab = ({ slug, business, run }: ProfileTabProps) => {
  const [draft, setDraft] = useState<UpdateBusinessInput>({})
  const [isSaving, setIsSaving] = useState(false)
  const values = { ...business, ...draft }
  const hasChanges = Object.keys(draft).length > 0

  const change = (patch: UpdateBusinessInput) => setDraft((current) => ({ ...current, ...patch }))

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setIsSaving(true)
    if (await run(() => updateBusiness(slug, draft), 'Профиль сохранён')) setDraft({})
    setIsSaving(false)
  }

  return (
    <form className={styles.section} onSubmit={handleSubmit}>
      <div className={styles.card}>
        {FIELDS.map(({ key, label, placeholder, type }) => (
          <Field key={key} label={label}>
            <Input
              type={type}
              inputMode={type === 'tel' ? 'tel' : undefined}
              value={values[key]}
              placeholder={placeholder}
              onValueChange={(value) => change({ [key]: value })}
            />
          </Field>
        ))}
        <Field label='Чем занимаетесь'>
          <Select
            aria-label='Чем занимаетесь'
            items={BUSINESS_KINDS}
            value={values.kind}
            onValueChange={(value) => value && change({ kind: value as BusinessKind })}
          />
        </Field>
        <label className={styles.switchRow}>
          <span className={styles.rowBody}>
            Страница открыта
            <span className={styles.rowMeta}>Выключите, чтобы временно остановить запись</span>
          </span>
          <Switch
            checked={values.isPublished}
            onCheckedChange={(isPublished) => change({ isPublished })}
          />
        </label>
      </div>
      <Button type='submit' size='lg' disabled={!hasChanges || isSaving}>
        Сохранить
      </Button>
    </form>
  )
}
