'use client'

import { Input } from '@awaisa/ui/Input'
import { type FormEvent, useState } from 'react'
import { useT } from '@/shared/i18n'
import { maskAmountInput, maskPhoneInput } from '@/shared/lib/inputMasks'
import { DateField } from '@/shared/ui/DateField/DateField'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'

interface CertificateSheetProps {
  onClose: () => void
  onIssue: (input: {
    amount: number
    recipient: string
    phone: string
    expiresOn: string | null
  }) => Promise<boolean>
}

const FORM_ID = 'certificate-form'

// A gift certificate sold at the desk: the code is generated and shown once issued.
export const CertificateSheet = ({ onClose, onIssue }: CertificateSheetProps) => {
  const t = useT()
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [phone, setPhone] = useState('')
  const [expiresOn, setExpiresOn] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const isValid = Number(amount) >= 100

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!isValid) return
    setIsSaving(true)
    const issued = await onIssue({
      amount: Number(amount),
      recipient: recipient.trim(),
      phone: phone.trim(),
      expiresOn: expiresOn || null,
    })
    setIsSaving(false)
    if (issued) onClose()
  }

  return (
    <Sheet
      title={t('Certificate')}
      onClose={onClose}
      action={{ label: t('Issue'), form: FORM_ID, disabled: !isValid || isSaving }}
    >
      <form id={FORM_ID} className={sheet.form} onSubmit={handleSubmit}>
        <section className={sheet.group} aria-label={t('Certificate')}>
          <div className={sheet.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Amount')}</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  aria-label={t('Certificate amount, som')}
                  inputMode='numeric'
                  placeholder='3 000'
                  value={maskAmountInput(amount)}
                  onValueChange={(value) => setAmount(value.replace(/\D/g, ''))}
                />
                <span className={sheet.suffix}>{t('som')}</span>
              </span>
            </label>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>{t('To')}</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  aria-label={t('To')}
                  placeholder={t('Name')}
                  value={recipient}
                  onValueChange={setRecipient}
                />
              </span>
            </label>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Phone')}</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  type='tel'
                  inputMode='tel'
                  aria-label={t('Recipient’s phone')}
                  placeholder={t('optional')}
                  value={phone}
                  onValueChange={(value) => setPhone(maskPhoneInput(value))}
                />
              </span>
            </label>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Valid until')}</span>
              <span className={sheet.rowControl}>
                <DateField
                  label={t('Valid until')}
                  placeholder={t('No end date')}
                  value={expiresOn}
                  onChange={setExpiresOn}
                  isClearable
                />
              </span>
            </div>
          </div>
          <p className={sheet.groupFooter}>
            {t(
              'We show the 8-character code right away. With a number, the certificate shows on the client’s card.',
            )}
          </p>
        </section>
      </form>
    </Sheet>
  )
}
