'use client'

import { Input } from '@awaisa/ui/Input'
import { Select } from '@awaisa/ui/Select'
import { Switch } from '@awaisa/ui/Switch'
import { CaretRight } from '@phosphor-icons/react/ssr'
import { type FormEvent, useState } from 'react'
import type { Business, BusinessKind, UpdateBusinessInput } from '@/shared/api/types'
import { BUSINESS_KINDS } from '@/shared/config/platform'
import { useT } from '@/shared/i18n'
import { maskPhoneInput } from '@/shared/lib/inputMasks'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import styles from './PageTab.module.css'

interface EditPageSheetProps {
  business: Business
  /** The week in one line, e.g. "Daily 09:00-21:00". */
  hoursText: string
  /** Opens the hours' own sheet in place of this one. */
  onEditHours: () => void
  /** Resolves to whether it saved; the sheet stays open when it did not. */
  onSave: (input: UpdateBusinessInput) => Promise<boolean>
  onClose: () => void
}

type ContactField = 'city' | 'address' | 'phone' | 'whatsapp' | 'mapUrl'

const CONTACTS: { key: ContactField; label: string; placeholder?: string; type?: string }[] = [
  { key: 'city', label: 'City' },
  { key: 'address', label: 'Address', placeholder: '125 Toktogul St' },
  { key: 'phone', label: 'Phone', type: 'tel' },
  { key: 'whatsapp', label: 'WhatsApp', type: 'tel', placeholder: 'Optional' },
  { key: 'mapUrl', label: 'Map link', placeholder: 'Optional' },
]

const FORM_ID = 'edit-page'

// "Edit", like Instagram's "Edit profile": everything written about the place in one
// sheet, so the page itself stays what clients see.
export const EditPageSheet = ({
  business,
  hoursText,
  onEditHours,
  onSave,
  onClose,
}: EditPageSheetProps) => {
  const t = useT()
  const [draft, setDraft] = useState<UpdateBusinessInput>({})
  const [isSaving, setIsSaving] = useState(false)
  const values = { ...business, ...draft }
  const hasChanges = Object.keys(draft).length > 0
  const canSave = hasChanges && values.name.trim().length > 0 && !isSaving

  const change = (patch: UpdateBusinessInput) => setDraft((current) => ({ ...current, ...patch }))

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSave) return
    setIsSaving(true)
    const isSaved = await onSave(draft)
    setIsSaving(false)
    if (isSaved) onClose()
  }

  return (
    <Sheet
      title={t('Edit')}
      onClose={onClose}
      action={{ label: t('Done'), form: FORM_ID, disabled: !canSave }}
    >
      <form id={FORM_ID} className={sheet.form} onSubmit={handleSubmit}>
        <div className={sheet.list}>
          <div className={sheet.row}>
            <span className={sheet.rowLabel}>{t('Name')}</span>
            <span className={sheet.rowControl}>
              <Input
                variant='plain'
                aria-label={t('Name')}
                value={values.name}
                maxLength={80}
                onValueChange={(name) => change({ name })}
              />
            </span>
          </div>
          <div className={sheet.row}>
            <span className={sheet.rowLabel}>{t('Type')}</span>
            <span className={sheet.rowControl}>
              <Select
                variant='plain'
                aria-label={t('What you do')}
                items={BUSINESS_KINDS.map((kind) => ({ ...kind, label: t(kind.label) }))}
                value={values.kind}
                onValueChange={(kind) => kind && change({ kind: kind as BusinessKind })}
              />
            </span>
          </div>
          <div className={`${sheet.row} ${sheet.textRow}`}>
            <textarea
              className={styles.sheetText}
              aria-label={t('About you in brief')}
              value={values.description}
              maxLength={500}
              rows={3}
              placeholder={t('A few words about you: what you are good at and for whom')}
              onChange={(event) => change({ description: event.target.value })}
            />
          </div>
        </div>

        <section className={sheet.group} aria-label={t('Contacts')}>
          <SectionCaption>{t('Contacts')}</SectionCaption>
          <div className={sheet.list}>
            {CONTACTS.map(({ key, label, placeholder, type }) => (
              <label key={key} className={sheet.row}>
                <span className={sheet.rowLabel}>{t(label)}</span>
                <span className={sheet.rowControl}>
                  <Input
                    variant='plain'
                    type={type}
                    inputMode={type === 'tel' ? 'tel' : undefined}
                    value={type === 'tel' ? maskPhoneInput(values[key]) : values[key]}
                    placeholder={t(placeholder ?? 'Not set')}
                    onValueChange={(value) =>
                      change({ [key]: type === 'tel' ? maskPhoneInput(value) : value })
                    }
                  />
                </span>
              </label>
            ))}
            <button
              type='button'
              className={`${sheet.row} ${styles.sheetLink}`}
              onClick={onEditHours}
            >
              <span className={sheet.rowLabel}>{t('Hours')}</span>
              <span className={styles.sheetValue}>
                {hoursText}
                <CaretRight aria-hidden />
              </span>
            </button>
          </div>
        </section>

        <section className={sheet.group} aria-label={t('Publishing')}>
          <div className={sheet.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Page is open')}</span>
              <Switch
                checked={values.isPublished}
                onCheckedChange={(isPublished) => change({ isPublished })}
              />
            </label>
          </div>
          <p className={sheet.groupFooter}>{t('Turn off to pause booking for a while.')}</p>
        </section>
      </form>
    </Sheet>
  )
}
