'use client'

import { Select } from '@awaisa/ui/Select'
import { Switch } from '@awaisa/ui/Switch'
import { Plus, X } from '@phosphor-icons/react/ssr'
import { type FormEvent, useState } from 'react'
import type { ReviewReplySettings } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import {
  fillReplyTemplate,
  MAX_QUICK_REPLIES,
  SAMPLE_REVIEW,
} from '@/views/manage/lib/replyTemplate'
import { TemplateField } from '@/views/manage/ui/TemplateField/TemplateField'
import { AUTO_REPLY_RATINGS, TEMPLATE_TOKENS } from './config'
import styles from './ReviewsTab.module.css'

interface ReplySettingsSheetProps {
  settings: ReviewReplySettings
  onSave: (settings: ReviewReplySettings) => Promise<void>
  onClose: () => void
}

const FORM_ID = 'review-reply-settings'

// «Ответы на отзывы»: the automatic reply to good reviews (on, which ratings, the words) and the
// quick replies offered above the reply field. Settings rows, edits kept until «Готово».
export const ReplySettingsSheet = ({ settings, onSave, onClose }: ReplySettingsSheetProps) => {
  const t = useT()
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
      title={t('Ответы на отзывы')}
      onClose={onClose}
      action={{ label: t('Готово'), form: FORM_ID, disabled: !canSave }}
    >
      <form id={FORM_ID} className={sheet.form} onSubmit={handleSubmit}>
        <section className={sheet.group} aria-label={t('Автоответ')}>
          <SectionCaption>{t('Автоответ')}</SectionCaption>
          <div className={sheet.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Отвечать на хорошие отзывы')}</span>
              <Switch
                checked={auto.isEnabled}
                onCheckedChange={(checked) => setAuto({ isEnabled: checked })}
              />
            </label>
            {auto.isEnabled && (
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>{t('Какие')}</span>
                <span className={sheet.rowControl}>
                  <Select
                    variant='plain'
                    aria-label={t('На какие оценки отвечать')}
                    items={AUTO_REPLY_RATINGS.map((item) => ({ ...item, label: t(item.label) }))}
                    value={auto.minRating}
                    onValueChange={(value) => value && setAuto({ minRating: value })}
                  />
                </span>
              </div>
            )}
            {auto.isEnabled && (
              <TemplateField
                label={t('Текст автоответа')}
                value={auto.template}
                onChange={(template) => setAuto({ template })}
                placeholder={t('Напишите текст ответа')}
                tokens={TEMPLATE_TOKENS}
                preview={
                  fillReplyTemplate(auto.template, SAMPLE_REVIEW) || t('Напишите текст ответа')
                }
              />
            )}
          </div>
          <p className={sheet.groupFooter}>
            {auto.isEnabled
              ? t(
                  'Ответ уйдёт через час после отзыва, только на новые отзывы. Имя клиента, мастер и услуга подставятся сами. На 3 ★ и ниже ответьте сами: Telegram напомнит.',
                )
              : t('Хорошие отзывы получат ваш ответ сами, а плохие останутся вам.')}
          </p>
        </section>

        <section className={sheet.group} aria-label={t('Быстрые ответы')}>
          <SectionCaption>{t('Быстрые ответы')}</SectionCaption>
          <div className={sheet.list}>
            {quickReplies.map((text, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: rows are edited in place, order is the key
              <div key={index} className={styles.quickRow}>
                <TemplateField
                  label={t('Быстрый ответ {number}', { number: index + 1 })}
                  value={text}
                  onChange={(next) =>
                    setQuick(quickReplies.map((item, at) => (at === index ? next : item)))
                  }
                  tokens={TEMPLATE_TOKENS}
                  placeholder={t('Текст ответа')}
                />
                <button
                  type='button'
                  className={styles.quickRemove}
                  onClick={() => setQuick(quickReplies.filter((_, at) => at !== index))}
                  aria-label={t('Удалить ответ')}
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
                {t('Добавить ответ')}
              </button>
            )}
          </div>
          <p className={sheet.groupFooter}>
            {t('Появляются над полем ответа: одно нажатие, и текст уже в поле с именем клиента.')}
          </p>
        </section>
      </form>
    </Sheet>
  )
}
