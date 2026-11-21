'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import { Select } from '@awaisa/ui/Select'
import { ChatCircle, Phone, WhatsappLogo } from '@phosphor-icons/react/ssr'
import { useEffect, useState } from 'react'
import { getManagedPromotions } from '@/shared/api/clientApi'
import type { ManagedReview, Promotion } from '@/shared/api/types'
import { formatPhone } from '@/shared/lib/formatPhone'
import { GlyphGroup } from '@/shared/ui/GlyphGroup/GlyphGroup'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import styles from './ReviewsTab.module.css'

interface ContactClientSheetProps {
  slug: string
  businessName: string
  review: ManagedReview
  /** Owners read the promo codes; staff write without one. */
  canOfferCode: boolean
  onClose: () => void
}

const NO_CODE = ''

const apologyText = (firstName: string, businessName: string) =>
  `${firstName}, здравствуйте! Это ${businessName}. Спасибо за честный отзыв, и простите, что визит вас огорчил. Расскажите, что пошло не так? Хотим исправить.`

// A poor review is settled with the person, not in public: a written apology ready to send by
// WhatsApp or SMS (or a call), with one of the place's promo codes when the owner wants to make up
// for it. The words stay editable; nothing is sent from here, the messenger opens with them.
export const ContactClientSheet = ({
  slug,
  businessName,
  review,
  canOfferCode,
  onClose,
}: ContactClientSheetProps) => {
  const firstName = review.authorName.split(' ')[0] ?? review.authorName
  const [text, setText] = useState(() => apologyText(firstName, businessName))
  const [codes, setCodes] = useState<Promotion[]>([])
  const [code, setCode] = useState(NO_CODE)
  const chosen = codes.find((item) => item.code === code)
  const message = chosen
    ? `${text.trim()}\n\nДарим промокод ${chosen.code}: −${chosen.percent}% на следующий визит.`
    : text.trim()
  const digits = review.customerPhone.replace(/\D/g, '')
  const body = encodeURIComponent(message)

  useEffect(() => {
    if (!canOfferCode) return
    const controller = new AbortController()
    getManagedPromotions(slug, controller.signal)
      .then((items) =>
        setCodes(items.filter((item) => item.kind === 'promo_code' && item.isActive && item.code)),
      )
      .catch(() => undefined)

    return () => controller.abort()
  }, [slug, canOfferCode])

  const codeItems = [
    { value: NO_CODE, label: 'Без промокода' },
    ...codes.map((item) => ({ value: item.code ?? '', label: `${item.code} · −${item.percent}%` })),
  ]

  return (
    <Sheet title='Написать клиенту' onClose={onClose} cancelLabel='Закрыть'>
      <div className={sheet.form}>
        <section className={sheet.group} aria-label='Сообщение'>
          <SectionCaption>{`${review.authorName} · ${formatPhone(review.customerPhone)}`}</SectionCaption>
          <div className={sheet.list}>
            <textarea
              aria-label='Текст сообщения'
              className={styles.message}
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={600}
              rows={5}
            />
            {codes.length > 0 && (
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>Промокод</span>
                <span className={sheet.rowControl}>
                  <Select
                    variant='plain'
                    aria-label='Промокод в подарок'
                    items={codeItems}
                    value={code}
                    onValueChange={(value) => setCode(value ?? NO_CODE)}
                  />
                </span>
              </div>
            )}
          </div>
          <p className={sheet.groupFooter}>
            {chosen
              ? 'Промокод добавится в конце сообщения.'
              : 'Откроется мессенджер с этим текстом. Когда договоритесь, отметьте отзыв «Решено».'}
          </p>
        </section>

        <div className={styles.contactActions}>
          <ButtonLink
            href={`https://wa.me/${digits}?text=${body}`}
            target='_blank'
            rel='noreferrer'
            className={styles.contactPrimary}
          >
            <WhatsappLogo aria-hidden />
            Написать в WhatsApp
          </ButtonLink>
          <GlyphGroup label='Другие способы связи'>
            <a href={`sms:${review.customerPhone}?&body=${body}`} title='SMS' aria-label='SMS'>
              <ChatCircle aria-hidden />
            </a>
            <a
              href={`tel:${review.customerPhone}`}
              title={formatPhone(review.customerPhone)}
              aria-label='Позвонить'
            >
              <Phone aria-hidden />
            </a>
          </GlyphGroup>
        </div>
      </div>
    </Sheet>
  )
}
