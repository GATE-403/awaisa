import { Button } from '@awaisa/ui/Button'
import { Input } from '@awaisa/ui/Input'
import { Select } from '@awaisa/ui/Select'
import { Switch } from '@awaisa/ui/Switch'
import { type FormEvent, useState } from 'react'
import { updateBusiness } from '@/shared/api/clientApi'
import type { Business, BusinessKind, UpdateBusinessInput } from '@/shared/api/types'
import { BUSINESS_KINDS } from '@/shared/config/platform'
import { maskPhoneInput } from '@/shared/lib/inputMasks'
import styles from '@/views/manage/ui/manageForms.module.css'
import { PhotosSection } from '@/views/manage/ui/PhotosSection/PhotosSection'
import { SectionHeader } from '@/views/manage/ui/SectionHeader/SectionHeader'
import { TelegramSection } from '@/views/manage/ui/TelegramSection/TelegramSection'

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
        variant='plain'
        type={type}
        inputMode={type === 'tel' ? 'tel' : undefined}
        value={values[key]}
        placeholder={placeholder ?? 'Не указано'}
        onValueChange={(value) => change({ [key]: type === 'tel' ? maskPhoneInput(value) : value })}
      />
    </label>
  )

  return (
    <form className={styles.section} onSubmit={handleSubmit} aria-label='Профиль'>
      <SectionHeader title='Профиль' description='Так бизнес выглядит в каталоге и на странице.' />

      <PhotosSection slug={slug} business={business} run={run} />

      <div className={styles.group}>
        <h3 className={styles.groupTitle}>О бизнесе</h3>
        <div className={styles.list}>
          {ABOUT.map(renderField)}
          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>Чем занимаетесь</span>
            <Select
              variant='plain'
              aria-label='Чем занимаетесь'
              items={BUSINESS_KINDS}
              value={values.kind}
              onValueChange={(value) => value && change({ kind: value as BusinessKind })}
            />
          </div>
        </div>
      </div>

      <div className={styles.group}>
        <h3 className={styles.groupTitle}>Контакты</h3>
        <div className={styles.list}>{CONTACTS.map(renderField)}</div>
      </div>

      <TelegramSection slug={slug} />

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

      {hasChanges && (
        <section className={styles.saveBar} aria-label='Несохранённые изменения'>
          <span className={styles.saveText}>Есть несохранённые изменения</span>
          <Button type='button' variant='secondary' size='sm' onClick={() => setDraft({})}>
            Отменить
          </Button>
          <Button type='submit' size='sm' disabled={isSaving}>
            Сохранить
          </Button>
        </section>
      )}
    </form>
  )
}
