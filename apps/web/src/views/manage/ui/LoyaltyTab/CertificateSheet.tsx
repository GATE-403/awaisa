'use client'

import { Input } from '@awaisa/ui/Input'
import { type FormEvent, useState } from 'react'
import { maskAmountInput, maskPhoneInput } from '@/shared/lib/inputMasks'
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
      title='Сертификат'
      onClose={onClose}
      action={{ label: 'Выпустить', form: FORM_ID, disabled: !isValid || isSaving }}
    >
      <form id={FORM_ID} className={sheet.form} onSubmit={handleSubmit}>
        <section className={sheet.group} aria-label='Сертификат'>
          <div className={sheet.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>Сумма</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  aria-label='Сумма сертификата, сом'
                  inputMode='numeric'
                  placeholder='3 000'
                  value={maskAmountInput(amount)}
                  onValueChange={(value) => setAmount(value.replace(/\D/g, ''))}
                />
                <span className={sheet.suffix}>сом</span>
              </span>
            </label>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>Кому</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  aria-label='Кому'
                  placeholder='Имя'
                  value={recipient}
                  onValueChange={setRecipient}
                />
              </span>
            </label>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>Телефон</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  type='tel'
                  inputMode='tel'
                  aria-label='Телефон получателя'
                  placeholder='необязательно'
                  value={phone}
                  onValueChange={(value) => setPhone(maskPhoneInput(value))}
                />
              </span>
            </label>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>Действует до</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  type='date'
                  aria-label='Действует до'
                  value={expiresOn}
                  onValueChange={setExpiresOn}
                />
              </span>
            </label>
          </div>
          <p className={sheet.groupFooter}>
            Код из 8 символов покажем сразу. С номером сертификат виден в карточке клиента.
          </p>
        </section>
      </form>
    </Sheet>
  )
}
