'use client'

import { Input } from '@awaisa/ui/Input'
import { Plus, X } from '@phosphor-icons/react/ssr'
import { type FormEvent, useState } from 'react'
import { maskAmountInput } from '@/shared/lib/inputMasks'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import { CERTIFICATE_AMOUNTS_MAX, DEFAULT_CERTIFICATE_AMOUNTS } from '../../config/certificates'
import own from './LoyaltyTab.module.css'

interface CertificateAmountsSheetProps {
  amounts: number[]
  onClose: () => void
  onSave: (amounts: number[]) => Promise<boolean>
}

const FORM_ID = 'certificate-amounts-form'

type Draft = { key: number; value: string }

// The amounts clients pick from on the place's page («Подарочный сертификат»).
export const CertificateAmountsSheet = ({
  amounts,
  onClose,
  onSave,
}: CertificateAmountsSheetProps) => {
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    (amounts.length > 0 ? amounts : DEFAULT_CERTIFICATE_AMOUNTS).map((amount, index) => ({
      key: index,
      value: String(amount),
    })),
  )
  const [isSaving, setIsSaving] = useState(false)
  const values = drafts.map((draft) => Number(draft.value)).filter((amount) => amount >= 100)
  const isValid = values.length > 0

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!isValid) return
    setIsSaving(true)
    const isSaved = await onSave(values)
    setIsSaving(false)
    if (isSaved) onClose()
  }

  const handleAdd = () => setDrafts((current) => [...current, { key: Date.now(), value: '' }])

  return (
    <Sheet
      title='Суммы'
      onClose={onClose}
      action={{ label: 'Готово', form: FORM_ID, disabled: !isValid || isSaving }}
    >
      <form id={FORM_ID} className={sheet.form} onSubmit={handleSubmit}>
        <section className={sheet.group} aria-label='Суммы сертификатов'>
          <div className={sheet.groupHeader}>
            <span />
            {drafts.length < CERTIFICATE_AMOUNTS_MAX && (
              <button type='button' className={sheet.groupLink} onClick={handleAdd}>
                <Plus weight='bold' aria-hidden /> Ещё сумма
              </button>
            )}
          </div>
          <div className={sheet.list}>
            {drafts.map((draft, index) => (
              <div key={draft.key} className={sheet.row}>
                <span className={sheet.rowLabel}>Сумма {index + 1}</span>
                <span className={sheet.rowControl}>
                  <Input
                    variant='plain'
                    aria-label={`Сумма ${index + 1}, сом`}
                    inputMode='numeric'
                    placeholder='3 000'
                    value={maskAmountInput(draft.value)}
                    onValueChange={(value) =>
                      setDrafts((current) =>
                        current.map((item) =>
                          item.key === draft.key
                            ? { ...item, value: value.replace(/\D/g, '') }
                            : item,
                        ),
                      )
                    }
                  />
                  <span className={sheet.suffix}>сом</span>
                  {drafts.length > 1 && (
                    <button
                      type='button'
                      className={own.remove}
                      aria-label={`Убрать сумму ${index + 1}`}
                      onClick={() =>
                        setDrafts((current) => current.filter((item) => item.key !== draft.key))
                      }
                    >
                      <X aria-hidden />
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
          <p className={sheet.groupFooter}>
            Клиент выбирает одну из сумм на странице места. От 100 сом, до шести сумм.
          </p>
        </section>
      </form>
    </Sheet>
  )
}
