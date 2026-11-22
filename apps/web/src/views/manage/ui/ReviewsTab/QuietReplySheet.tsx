'use client'

import { Select } from '@awaisa/ui/Select'
import { type FormEvent, useState } from 'react'
import { useT } from '@/shared/i18n'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import { fillReplyTemplate, SAMPLE_REVIEW } from '@/views/manage/lib/replyTemplate'
import { TemplateField } from '@/views/manage/ui/TemplateField/TemplateField'
import { REVIEW_WORDS, TEMPLATE_TOKENS } from './config'

interface QuietReplySheetProps {
  /** Unanswered reviews without words: rated 5, and rated 4 or 5. */
  counts: { fiveStars: number; fourAndUp: number }
  /** The automatic reply's words, the natural start. */
  template: string
  /** Resolves once sent; the sheet stays open when it throws. */
  onSend: (input: { minRating: 4 | 5; template: string }) => Promise<void>
  onClose: () => void
}

const FORM_ID = 'quiet-reply'

// «Ответить всем»: the backlog of good ratings left without a word gets one thank-you, filled per
// client. Only reviews without text: whoever wrote something gets a reply of the owner's own.
export const QuietReplySheet = ({ counts, template, onSend, onClose }: QuietReplySheetProps) => {
  const t = useT()
  const [minRating, setMinRating] = useState<4 | 5>(counts.fiveStars > 0 ? 5 : 4)
  const [text, setText] = useState(template)
  const [isSending, setIsSending] = useState(false)
  const count = minRating === 5 ? counts.fiveStars : counts.fourAndUp
  const canSend = count > 0 && text.trim().length > 0 && !isSending
  const ratings = [
    { value: 5 as const, label: `${t('Только 5 ★')} · ${counts.fiveStars}` },
    { value: 4 as const, label: `${t('4 и 5 ★')} · ${counts.fourAndUp}` },
  ]

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSend) return
    setIsSending(true)
    try {
      await onSend({ minRating, template: text.trim() })
      onClose()
    } catch {
      // The toast has said what went wrong.
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Sheet
      title={t('Ответить всем')}
      onClose={onClose}
      action={{ label: t('Отправить'), form: FORM_ID, disabled: !canSend }}
    >
      <form id={FORM_ID} className={sheet.form} onSubmit={handleSubmit}>
        <section className={sheet.group} aria-label={t('Кому')}>
          <div className={sheet.list}>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Оценки')}</span>
              <span className={sheet.rowControl}>
                <Select
                  variant='plain'
                  aria-label={t('На какие оценки ответить')}
                  items={ratings}
                  value={minRating}
                  onValueChange={(value) => value && setMinRating(value)}
                />
              </span>
            </div>
          </div>
          <p className={sheet.groupFooter}>
            {t('Ответ получат {reviews} без текста. На отзывы с текстом ответьте сами.', {
              reviews: t.count(count, [...REVIEW_WORDS]),
            })}
          </p>
        </section>

        <section className={sheet.group} aria-label={t('Текст ответа')}>
          <SectionCaption>{t('Ответ')}</SectionCaption>
          <div className={sheet.list}>
            <TemplateField
              label={t('Текст ответа')}
              value={text}
              onChange={setText}
              placeholder={t('Напишите текст ответа')}
              tokens={TEMPLATE_TOKENS}
              preview={fillReplyTemplate(text, SAMPLE_REVIEW) || t('Напишите текст ответа')}
            />
          </div>
          <p className={sheet.groupFooter}>
            {t('Имя клиента, мастер и услуга подставятся в каждый ответ.')}
          </p>
        </section>
      </form>
    </Sheet>
  )
}
