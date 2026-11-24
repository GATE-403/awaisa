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
      title={t('Review replies')}
      onClose={onClose}
      action={{ label: t('Done'), form: FORM_ID, disabled: !canSave }}
    >
      <form id={FORM_ID} className={sheet.form} onSubmit={handleSubmit}>
        <section className={sheet.group} aria-label={t('Auto reply')}>
          <SectionCaption>{t('Auto reply')}</SectionCaption>
          <div className={sheet.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Reply to good reviews')}</span>
              <Switch
                checked={auto.isEnabled}
                onCheckedChange={(checked) => setAuto({ isEnabled: checked })}
              />
            </label>
            {auto.isEnabled && (
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>{t('Which')}</span>
                <span className={sheet.rowControl}>
                  <Select
                    variant='plain'
                    aria-label={t('Which ratings get a reply')}
                    items={AUTO_REPLY_RATINGS.map((item) => ({ ...item, label: t(item.label) }))}
                    value={auto.minRating}
                    onValueChange={(value) => value && setAuto({ minRating: value })}
                  />
                </span>
              </div>
            )}
            {auto.isEnabled && (
              <TemplateField
                label={t('Auto reply text')}
                value={auto.template}
                onChange={(template) => setAuto({ template })}
                placeholder={t('Write the reply')}
                tokens={TEMPLATE_TOKENS}
                preview={fillReplyTemplate(auto.template, SAMPLE_REVIEW) || t('Write the reply')}
              />
            )}
          </div>
          <p className={sheet.groupFooter}>
            {auto.isEnabled
              ? t(
                  'The reply goes out an hour after the review, to new reviews only. The client name, specialist and service fill in by themselves. Answer 3 ★ and below yourself: Telegram will remind you.',
                )
              : t('Good reviews get your reply by themselves; poor ones stay with you.')}
          </p>
        </section>

        <section className={sheet.group} aria-label={t('Quick replies')}>
          <SectionCaption>{t('Quick replies')}</SectionCaption>
          <div className={sheet.list}>
            {quickReplies.map((text, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: rows are edited in place, order is the key
              <div key={index} className={styles.quickRow}>
                <TemplateField
                  label={t('Quick reply {number}', { number: index + 1 })}
                  value={text}
                  onChange={(next) =>
                    setQuick(quickReplies.map((item, at) => (at === index ? next : item)))
                  }
                  tokens={TEMPLATE_TOKENS}
                  placeholder={t('Reply text')}
                />
                <button
                  type='button'
                  className={styles.quickRemove}
                  onClick={() => setQuick(quickReplies.filter((_, at) => at !== index))}
                  aria-label={t('Delete reply')}
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
                {t('Add a reply')}
              </button>
            )}
          </div>
          <p className={sheet.groupFooter}>
            {t('They appear by the reply field: one tap puts the text in, with the client name.')}
          </p>
        </section>
      </form>
    </Sheet>
  )
}
