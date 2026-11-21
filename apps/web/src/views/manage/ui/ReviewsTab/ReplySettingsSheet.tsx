'use client'

import { Select } from '@awaisa/ui/Select'
import { Switch } from '@awaisa/ui/Switch'
import { Plus, X } from '@phosphor-icons/react/ssr'
import { type FormEvent, useState } from 'react'
import type { ReviewReplySettings } from '@/shared/api/types'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import {
  fillReplyTemplate,
  MAX_QUICK_REPLIES,
  SAMPLE_REVIEW,
} from '@/views/manage/lib/replyTemplate'
import { AUTO_REPLY_RATINGS } from './config'
import styles from './ReviewsTab.module.css'
import { TemplateField } from './TemplateField'

interface ReplySettingsSheetProps {
  settings: ReviewReplySettings
  onSave: (settings: ReviewReplySettings) => Promise<void>
  onClose: () => void
}

const FORM_ID = 'review-reply-settings'

// «Ответы на отзывы»: the automatic reply to good reviews (on, which ratings, the words) and the
// quick replies offered above the reply field. Settings rows, edits kept until «Готово».
export const ReplySettingsSheet = ({ settings, onSave, onClose }: ReplySettingsSheetProps) => {
  const [draft, setDraft] = useState(settings)
  const [isSaving, setIsSaving] = useState(false)
  const auto = draft.autoReply
  const quickReplies = draft.quickReplies
  const canSave = auto.template.trim().length > 0 && !isSaving

  const setAuto = (patch: Partial<ReviewReplySettings['autoReply']>) =>
    setDraft((current) => ({ ...current, autoReply: { ...current.autoReply, ...patch } }))

  const setQuick = (next: string[]) => setDraft((current) => ({ ...current, quickReplies: next }))

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSave) return
    setIsSaving(true)
    try {
      await onSave({
        autoReply: { ...auto, template: auto.template.trim() },
        quickReplies: quickReplies.map((text) => text.trim()).filter(Boolean),
      })
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Sheet
      title='Ответы на отзывы'
      onClose={onClose}
      action={{ label: 'Готово', form: FORM_ID, disabled: !canSave }}
    >
      <form id={FORM_ID} className={sheet.form} onSubmit={handleSubmit}>
        <section className={sheet.group} aria-label='Автоответ'>
          <SectionCaption>Автоответ</SectionCaption>
          <div className={sheet.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>Отвечать на хорошие отзывы</span>
              <Switch
                checked={auto.isEnabled}
                onCheckedChange={(checked) => setAuto({ isEnabled: checked })}
              />
            </label>
            {auto.isEnabled && (
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>Какие</span>
                <span className={sheet.rowControl}>
                  <Select
                    variant='plain'
                    aria-label='На какие оценки отвечать'
                    items={AUTO_REPLY_RATINGS}
                    value={auto.minRating}
                    onValueChange={(value) => value && setAuto({ minRating: value })}
                  />
                </span>
              </div>
            )}
            {auto.isEnabled && (
              <div className={styles.templateRow}>
                <TemplateField
                  label='Текст автоответа'
                  value={auto.template}
                  onChange={(template) => setAuto({ template })}
                  placeholder='Напишите текст ответа'
                />
                <p className={styles.templatePreview}>
                  {fillReplyTemplate(auto.template, SAMPLE_REVIEW) || 'Напишите текст ответа'}
                </p>
              </div>
            )}
          </div>
          <p className={sheet.groupFooter}>
            {auto.isEnabled
              ? 'Ответ уйдёт через час после отзыва, только на новые отзывы. Имя клиента, мастер и услуга подставятся сами. На 3 ★ и ниже ответьте сами: Telegram напомнит.'
              : 'Хорошие отзывы получат ваш ответ сами, а плохие останутся вам.'}
          </p>
        </section>

        <section className={sheet.group} aria-label='Быстрые ответы'>
          <SectionCaption>Быстрые ответы</SectionCaption>
          <div className={sheet.list}>
            {quickReplies.map((text, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: rows are edited in place, order is the key
              <div key={index} className={styles.quickRow}>
                <TemplateField
                  label={`Быстрый ответ ${index + 1}`}
                  value={text}
                  onChange={(next) =>
                    setQuick(quickReplies.map((item, at) => (at === index ? next : item)))
                  }
                  placeholder='Текст ответа'
                />
                <button
                  type='button'
                  className={styles.quickRemove}
                  onClick={() => setQuick(quickReplies.filter((_, at) => at !== index))}
                  aria-label='Удалить ответ'
                >
                  <X aria-hidden />
                </button>
              </div>
            ))}
            {quickReplies.length < MAX_QUICK_REPLIES && (
              <button
                type='button'
                className={`${sheet.row} ${styles.quickAdd}`}
                onClick={() => setQuick([...quickReplies, ''])}
              >
                <Plus aria-hidden />
                Добавить ответ
              </button>
            )}
          </div>
          <p className={sheet.groupFooter}>
            Появляются над полем ответа: одно нажатие, и текст уже в поле с именем клиента.
          </p>
        </section>
      </form>
    </Sheet>
  )
}
