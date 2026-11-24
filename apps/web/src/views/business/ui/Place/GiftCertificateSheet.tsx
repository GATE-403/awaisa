'use client'

import { Input } from '@awaisa/ui/Input'
import { Select } from '@awaisa/ui/Select'
import { Trans, useLingui } from '@lingui/react/macro'
import { type FormEvent, useState } from 'react'
import { readContact } from '@/entities/booking'
import { useSession } from '@/entities/session'
import { getErrorMessage } from '@/shared/api/apiError'
import { orderCertificate } from '@/shared/api/clientApi'
import type { Business } from '@/shared/api/types'
import { PHONE_PLACEHOLDER, WHOLE_PHONE_DIGITS } from '@/shared/config/region'
import { useFormat } from '@/shared/i18n'
import { maskPhoneInput } from '@/shared/lib/inputMasks'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { SegmentedControl } from '@/shared/ui/SegmentedControl/SegmentedControl'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import styles from './GiftCertificate.module.css'

interface GiftCertificateSheetProps {
  business: Business
  amounts: number[]
  initialAmount: number
  onClose: () => void
}

const FORM_ID = 'gift-certificate-form'
/** More amounts than fit a segmented control go into the kit's list. */
const SEGMENTS_MAX = 4

const isWholePhone = (value: string) => value.replace(/\D/g, '').length === WHOLE_PHONE_DIGITS

// The order: amount, who it is for, who it is from and a few words. «Pay» opens the
// checkout; the gift card is issued only once the payment is confirmed.
export const GiftCertificateSheet = ({
  business,
  amounts,
  initialAmount,
  onClose,
}: GiftCertificateSheetProps) => {
  const format = useFormat()
  const { t } = useLingui()
  const session = useSession()
  const isSignedIn = session.status === 'signedIn'
  const [saved] = useState(() => (typeof window === 'undefined' ? null : readContact()))
  const [amount, setAmount] = useState(initialAmount)
  const [recipientName, setRecipientName] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [buyerName, setBuyerName] = useState(session.customer?.name ?? saved?.name ?? '')
  const [buyerPhone, setBuyerPhone] = useState(saved?.phone ? maskPhoneInput(saved.phone) : '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPaying, setIsPaying] = useState(false)
  const items = amounts.map((value) => ({ value: String(value), label: format.price(value) }))

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!buyerName.trim()) {
      setError(t`Say who the gift card is from`)
      return
    }
    if (!isSignedIn && !isWholePhone(buyerPhone)) {
      setError(t`Check your number: the code will be sent to it`)
      return
    }
    if (recipientPhone && !isWholePhone(recipientPhone)) {
      setError(t`Check the recipient’s number or leave it empty`)
      return
    }
    setIsPaying(true)
    setError(null)
    try {
      const order = await orderCertificate(business.slug, {
        amount,
        buyerName: buyerName.trim(),
        buyerPhone: isSignedIn ? '' : buyerPhone,
        recipientName: recipientName.trim(),
        recipientPhone,
        message: message.trim(),
      })
      // The test checkout is our own /pay page; a real acquirer has a page of its own.
      window.location.assign(order.checkoutUrl)
    } catch (orderError) {
      setError(getErrorMessage(orderError))
      setIsPaying(false)
    }
  }

  return (
    <Sheet
      title={t`Gift card`}
      onClose={onClose}
      action={{
        label: isPaying ? t`One moment…` : t`Pay`,
        form: FORM_ID,
        disabled: isPaying,
      }}
    >
      <form id={FORM_ID} className={sheet.form} onSubmit={handleSubmit} noValidate>
        <section className={sheet.group} aria-label={t`Amount`}>
          {items.length <= SEGMENTS_MAX ? (
            <SegmentedControl
              label={t`Gift card amount`}
              value={String(amount)}
              items={items}
              onChange={(value) => setAmount(Number(value))}
            />
          ) : (
            <div className={sheet.list}>
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>
                  <Trans>Amount</Trans>
                </span>
                <span className={sheet.rowControl}>
                  <Select
                    variant='plain'
                    aria-label={t`Gift card amount`}
                    items={items}
                    value={String(amount)}
                    onValueChange={(value) => value && setAmount(Number(value))}
                  />
                </span>
              </div>
            </div>
          )}
        </section>

        <section className={sheet.group} aria-label={t`To`}>
          <SectionCaption>{t`To`}</SectionCaption>
          <div className={sheet.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>
                <Trans>Name</Trans>
              </span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  aria-label={t`Recipient’s name`}
                  placeholder={t`Aigul`}
                  autoComplete='off'
                  value={recipientName}
                  onValueChange={setRecipientName}
                />
              </span>
            </label>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>
                <Trans>Phone</Trans>
              </span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  type='tel'
                  inputMode='tel'
                  aria-label={t`Recipient’s phone`}
                  placeholder={t`optional`}
                  autoComplete='off'
                  value={recipientPhone}
                  onValueChange={(value) => setRecipientPhone(maskPhoneInput(value))}
                />
              </span>
            </label>
            <label className={styles.messageRow}>
              <textarea
                aria-label={t`Message`}
                className={styles.message}
                placeholder={t`A few words`}
                maxLength={300}
                rows={2}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </label>
          </div>
          <p className={sheet.groupFooter}>
            <Trans>With a number, the code and your words go to the recipient.</Trans>
          </p>
        </section>

        <section className={sheet.group} aria-label={t`From`}>
          <SectionCaption>
            <Trans>From</Trans>
          </SectionCaption>
          <div className={sheet.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>
                <Trans>Name</Trans>
              </span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  aria-label={t`Your name`}
                  placeholder={t`Your name`}
                  autoComplete='given-name'
                  value={buyerName}
                  onValueChange={setBuyerName}
                />
              </span>
            </label>
            {!isSignedIn && (
              <label className={sheet.row}>
                <span className={sheet.rowLabel}>
                  <Trans>Phone</Trans>
                </span>
                <span className={sheet.rowControl}>
                  <Input
                    variant='plain'
                    type='tel'
                    inputMode='tel'
                    aria-label={t`Your phone`}
                    placeholder={PHONE_PLACEHOLDER}
                    autoComplete='tel'
                    value={buyerPhone}
                    onValueChange={(value) => setBuyerPhone(maskPhoneInput(value))}
                  />
                </span>
              </label>
            )}
          </div>
          <p className={sheet.groupFooter}>
            <Trans>
              You get the code after paying. The gift card never expires and can be spent in parts.
            </Trans>
          </p>
        </section>

        {error && (
          <p className={styles.error} role='alert'>
            {error}
          </p>
        )}
      </form>
    </Sheet>
  )
}
