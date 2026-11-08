import { Button } from '@awaisa/ui/Button'
import { Input } from '@awaisa/ui/Input'
import { Select } from '@awaisa/ui/Select'
import { Switch } from '@awaisa/ui/Switch'
import { type FormEvent, useState } from 'react'
import { updateBusiness } from '@/common/api/clientApi'
import type { Business, BusinessKind, UpdateBusinessInput } from '@/common/api/types'
import { BUSINESS_KINDS } from '@/constants/platform'
import styles from '../manageForms.module.css'
import { SectionHeader } from '../SectionHeader/SectionHeader'

interface ProfileTabProps {
  slug: string
  business: Business
  run: (action: () => Promise<unknown>, successTitle: string) => Promise<boolean>
}

type TextField = 'name' | 'description' | 'city' | 'address' | 'phone' | 'whatsapp' | 'mapUrl'

type FieldConfig = { key: TextField; label: string; placeholder?: string; type?: string }

const ABOUT: FieldConfig[] = [
  { key: 'name', label: 'Название' },
  { key: 'description', label: 'Коротко о вас', placeholder: 'Стрижки и уход для мужчин' },
]

const CONTACTS: FieldConfig[] = [
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

  const renderField = ({ key, label, placeholder, type }: FieldConfig) => (
    <label key={key} className={styles.fieldRow}>
      <span className={styles.fieldLabel}>{label}</span>
      <Input
        type={type}
        inputMode={type === 'tel' ? 'tel' : undefined}
        value={values[key]}
        placeholder={placeholder}
        onValueChange={(value) => change({ [key]: value })}
        className={styles.fieldInput}
      />
    </label>
  )

  return (
    <form className={styles.section} onSubmit={handleSubmit} aria-label='Профиль'>
      <SectionHeader title='Профиль' description='Так бизнес выглядит в каталоге и на странице.' />

      <div className={styles.group}>
        <h3 className={styles.groupTitle}>О бизнесе</h3>
        <div className={styles.list}>
          {ABOUT.map(renderField)}
          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>Чем занимаетесь</span>
            <Select
              aria-label='Чем занимаетесь'
              items={BUSINESS_KINDS}
              value={values.kind}
              onValueChange={(value) => value && change({ kind: value as BusinessKind })}
              className={styles.fieldInput}
            />
          </div>
        </div>
      </div>

      <div className={styles.group}>
        <h3 className={styles.groupTitle}>Контакты</h3>
        <div className={styles.list}>{CONTACTS.map(renderField)}</div>
      </div>

      <div className={styles.group}>
        <h3 className={styles.groupTitle}>Публикация</h3>
        <div className={styles.list}>
          <label className={styles.settingRow}>
            <span className={styles.rowBody}>
              <span className={styles.rowTitle}>Страница открыта</span>
              <span className={styles.rowMeta}>Выключите, чтобы временно остановить запись</span>
            </span>
            <Switch
              checked={values.isPublished}
              onCheckedChange={(isPublished) => change({ isPublished })}
            />
          </label>
        </div>
      </div>

      <div className={styles.formActions}>
        {hasChanges && (
          <Button type='button' variant='secondary' onClick={() => setDraft({})}>
            Отменить
          </Button>
        )}
        <Button type='submit' disabled={!hasChanges || isSaving}>
          Сохранить
        </Button>
      </div>
    </form>
  )
}
