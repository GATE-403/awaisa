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
      title={t('Сертификат')}
      onClose={onClose}
      action={{ label: t('Выпустить'), form: FORM_ID, disabled: !isValid || isSaving }}
    >
      <form id={FORM_ID} className={sheet.form} onSubmit={handleSubmit}>
        <section className={sheet.group} aria-label={t('Сертификат')}>
          <div className={sheet.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Сумма')}</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  aria-label={t('Сумма сертификата, сом')}
                  inputMode='numeric'
                  placeholder='3 000'
                  value={maskAmountInput(amount)}
                  onValueChange={(value) => setAmount(value.replace(/\D/g, ''))}
                />
                <span className={sheet.suffix}>{t('сом')}</span>
              </span>
            </label>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Кому')}</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  aria-label={t('Кому')}
                  placeholder={t('Имя')}
                  value={recipient}
                  onValueChange={setRecipient}
                />
              </span>
            </label>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Телефон')}</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  type='tel'
                  inputMode='tel'
                  aria-label={t('Телефон получателя')}
                  placeholder={t('необязательно')}
                  value={phone}
                  onValueChange={(value) => setPhone(maskPhoneInput(value))}
                />
              </span>
            </label>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Действует до')}</span>
              <span className={sheet.rowControl}>
                <DateField
                  label={t('Действует до')}
                  placeholder={t('Без срока')}
                  value={expiresOn}
                  onChange={setExpiresOn}
                  isClearable
                />
              </span>
            </div>
          </div>
          <p className={sheet.groupFooter}>
            {t('Код из 8 символов покажем сразу. С номером сертификат виден в карточке клиента.')}
          </p>
        </section>
      </form>
    </Sheet>
  )
}
