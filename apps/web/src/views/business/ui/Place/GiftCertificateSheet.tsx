'use client'

import { Input } from '@awaisa/ui/Input'
import { Select } from '@awaisa/ui/Select'
import { type FormEvent, useState } from 'react'
import { formatPrice, readContact } from '@/entities/booking'
import { useSession } from '@/entities/session'
import { getErrorMessage } from '@/shared/api/apiError'
import { orderCertificate } from '@/shared/api/clientApi'
import type { Business } from '@/shared/api/types'
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
const PHONE_DIGITS = 12

const isWholePhone = (value: string) => value.replace(/\D/g, '').length === PHONE_DIGITS

// The order: amount, who it is for, who it is from and a few words. «Pay» opens the
// checkout; the gift card is issued only once the payment is confirmed.
export const GiftCertificateSheet = ({
  business,
  amounts,
  initialAmount,
  onClose,
}: GiftCertificateSheetProps) => {
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
  const items = amounts.map((value) => ({ value: String(value), label: formatPrice(value) }))

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!buyerName.trim()) {
      setError('Say who the gift card is from')
      return
    }
    if (!isSignedIn && !isWholePhone(buyerPhone)) {
      setError('Check your number: the code will be sent to it')
      return
    }
    if (recipientPhone && !isWholePhone(recipientPhone)) {
      setError('Check the recipient’s number or leave it empty')
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
      title='Gift card'
      onClose={onClose}
      action={{
        label: isPaying ? 'One moment…' : 'Pay',
        form: FORM_ID,
        disabled: isPaying,
      }}
    >
      <form id={FORM_ID} className={sheet.form} onSubmit={handleSubmit} noValidate>
        <section className={sheet.group} aria-label='Amount'>
          {items.length <= SEGMENTS_MAX ? (
            <SegmentedControl
              label='Gift card amount'
              value={String(amount)}
              items={items}
              onChange={(value) => setAmount(Number(value))}
            />
          ) : (
            <div className={sheet.list}>
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>Amount</span>
                <span className={sheet.rowControl}>
                  <Select
                    variant='plain'
                    aria-label='Gift card amount'
                    items={items}
                    value={String(amount)}
                    onValueChange={(value) => value && setAmount(Number(value))}
                  />
                </span>
              </div>
            </div>
          )}
        </section>

        <section className={sheet.group} aria-label='To'>
          <SectionCaption>To</SectionCaption>
          <div className={sheet.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>Name</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  aria-label='Recipient’s name'
                  placeholder='Aigul'
                  autoComplete='off'
                  value={recipientName}
                  onValueChange={setRecipientName}
                />
              </span>
            </label>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>Phone</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  type='tel'
                  inputMode='tel'
                  aria-label='Recipient’s phone'
                  placeholder='optional'
                  autoComplete='off'
                  value={recipientPhone}
                  onValueChange={(value) => setRecipientPhone(maskPhoneInput(value))}
                />
              </span>
            </label>
            <label className={styles.messageRow}>
              <textarea
                aria-label='Message'
                className={styles.message}
                placeholder='A few words'
                maxLength={300}
                rows={2}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </label>
          </div>
          <p className={sheet.groupFooter}>
            With a number, the code and your words go to the recipient.
          </p>
        </section>

        <section className={sheet.group} aria-label='From'>
          <SectionCaption>From</SectionCaption>
          <div className={sheet.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>Name</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  aria-label='Your name'
                  placeholder='Your name'
                  autoComplete='given-name'
                  value={buyerName}
                  onValueChange={setBuyerName}
                />
              </span>
            </label>
            {!isSignedIn && (
              <label className={sheet.row}>
                <span className={sheet.rowLabel}>Phone</span>
                <span className={sheet.rowControl}>
                  <Input
                    variant='plain'
                    type='tel'
                    inputMode='tel'
                    aria-label='Your phone'
                    placeholder='+996 555 123 456'
                    autoComplete='tel'
                    value={buyerPhone}
                    onValueChange={(value) => setBuyerPhone(maskPhoneInput(value))}
                  />
                </span>
              </label>
            )}
          </div>
          <p className={sheet.groupFooter}>
            You get the code after paying. The gift card never expires and can be spent in parts.
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
