'use client'

import { Select } from '@awaisa/ui/Select'
import { Switch } from '@awaisa/ui/Switch'
import { useToast } from '@awaisa/ui/Toast'
import { type FormEvent, useEffect, useState } from 'react'
import { getErrorMessage } from '@/shared/api/apiError'
import {
  getMailings,
  previewMailing,
  sendMailing,
  setBirthdayGreeting,
} from '@/shared/api/clientApi'
import type { MailingSegment, MailingsOverview } from '@/shared/api/types'
import { BUSINESS_TIME_ZONE } from '@/shared/lib/businessTime'
import { pluralize } from '@/shared/lib/plural'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { SegmentedControl } from '@/shared/ui/SegmentedControl/SegmentedControl'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import { TemplateField } from '@/views/manage/ui/TemplateField/TemplateField'
import styles from './MailingSheet.module.css'

interface MailingSheetProps {
  slug: string
  businessName: string
  /** The segment it opens on (a clients tab's «Позвать»); «Давно не были» by default. */
  initialSegment?: MailingSegment
  onClose: () => void
}

const FORM_ID = 'mailing-form'

const SEGMENTS: { value: MailingSegment; label: string }[] = [
  { value: 'lapsed', label: 'Давно не были' },
  { value: 'birthday', label: 'День рождения' },
  { value: 'all', label: 'Все' },
]

const LAPSED_DAYS = [30, 60, 90, 180].map((days) => ({ value: days, label: `${days} дней` }))

const templates = (name: string): Record<MailingSegment, string> => ({
  lapsed: `{имя}, давно вас не видели в ${name}! Запишитесь, когда удобно: {ссылка}`,
  birthday: `{имя}, скоро ваш день рождения! ${name} дарит −10% на визит в эти дни: {ссылка}`,
  all: `{имя}, новости ${name}: {ссылка}`,
})

// The placeholders a mailing takes, as pills in the shared template editor (the same as replies).
const MAILING_TOKENS = [
  { key: 'имя', label: 'Имя клиента' },
  { key: 'ссылка', label: 'Ссылка на запись' },
] as const

/** Cyrillic SMS: 70 characters in one part, 67 per part when longer. */
const smsParts = (text: string) => (text.length <= 70 ? 1 : Math.ceil(text.length / 67))

// A mailing in three choices: whom, what, send. The count is known before sending.
export const MailingSheet = ({
  slug,
  businessName,
  initialSegment = 'lapsed',
  onClose,
}: MailingSheetProps) => {
  const toast = useToast()
  const [segment, setSegment] = useState<MailingSegment>(initialSegment)
  const [days, setDays] = useState(60)
  const [text, setText] = useState(templates(businessName)[initialSegment])
  const [preview, setPreview] = useState<{ count: number; names: string[] } | null>(null)
  const [overview, setOverview] = useState<MailingsOverview | null>(null)
  const [isSending, setIsSending] = useState(false)
  // How it reads for one client; the SMS parts are counted with the link as it is sent.
  const sample = text
    .replaceAll('{имя}', 'Айгерим')
    .replaceAll('{ссылка}', `awaisa.kg/${slug}/book`)
  const sent = text
    .replaceAll('{имя}', 'Айгерим')
    .replaceAll('{ссылка}', `https://awaisa.kg/${slug}/book`)

  useEffect(() => {
    const controller = new AbortController()
    getMailings(slug, controller.signal)
      .then(setOverview)
      .catch(() => undefined)
    return () => controller.abort()
  }, [slug])

  useEffect(() => {
    const controller = new AbortController()
    setPreview(null)
    previewMailing(slug, segment, days, controller.signal)
      .then(setPreview)
      .catch(() => undefined)
    return () => controller.abort()
  }, [slug, segment, days])

  const changeSegment = (next: MailingSegment) => {
    const defaults = templates(businessName)
    if (text === defaults[segment]) setText(defaults[next])
    setSegment(next)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!preview?.count) return
    setIsSending(true)
    try {
      const result = await sendMailing(slug, { segment, days, text })
      toast.show({
        title: `Отправлено: ${pluralize(result.recipients, ['клиенту', 'клиентам', 'клиентам'])}`,
        type: 'success',
      })
      onClose()
    } catch (error) {
      toast.show({ title: 'Не отправилось', description: getErrorMessage(error), type: 'error' })
    } finally {
      setIsSending(false)
    }
  }

  const toggleBirthday = async (isOn: boolean) => {
    try {
      const greeting = isOn ? `{имя}, с днём рождения! ${businessName} ждёт вас: {ссылка}` : null
      await setBirthdayGreeting(slug, greeting)
      setOverview((current) => (current ? { ...current, birthdayGreeting: greeting } : current))
      toast.show({ title: isOn ? 'Будем поздравлять' : 'Поздравления выключены', type: 'success' })
    } catch (error) {
      toast.show({ title: 'Не сохранилось', description: getErrorMessage(error), type: 'error' })
    }
  }

  return (
    <Sheet
      title='Рассылка'
      onClose={onClose}
      action={{
        label: isSending ? 'Отправляем…' : 'Отправить',
        form: FORM_ID,
        disabled: !preview?.count || isSending || text.trim().length < 10,
      }}
    >
      <form id={FORM_ID} className={sheet.form} onSubmit={handleSubmit}>
        <SegmentedControl label='Кому' value={segment} items={SEGMENTS} onChange={changeSegment} />

        <section className={sheet.group} aria-label='Кому'>
          <div className={sheet.list}>
            {segment === 'lapsed' && (
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>Не были</span>
                <span className={sheet.rowControl}>
                  <Select
                    variant='plain'
                    aria-label='Не были дольше'
                    items={LAPSED_DAYS}
                    value={days}
                    onValueChange={(value) => value && setDays(value)}
                  />
                </span>
              </div>
            )}
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>Получат</span>
              <span className={styles.count} aria-live='polite'>
                {preview === null
                  ? '…'
                  : pluralize(preview.count, ['клиент', 'клиента', 'клиентов'])}
              </span>
            </div>
          </div>
          <p className={sheet.groupFooter}>
            {preview && preview.names.length > 0
              ? `${preview.names.join(', ')}${preview.count > preview.names.length ? ' и другие' : ''}. Только те, кто не отключал SMS.`
              : segment === 'birthday'
                ? 'Дни рождения в ближайшую неделю — из карточек клиентов.'
                : 'Только клиенты, которые не отключали SMS.'}
          </p>
        </section>

        <section className={sheet.group} aria-label='Текст'>
          <SectionCaption>Текст</SectionCaption>
          <div className={sheet.list}>
            <TemplateField
              label='Текст рассылки'
              value={text}
              onChange={setText}
              tokens={MAILING_TOKENS}
              placeholder='Напишите текст рассылки'
              preview={sample}
            />
          </div>
          <p className={sheet.groupFooter}>
            ≈ {sent.length} символов, {pluralize(smsParts(sent), ['SMS', 'SMS', 'SMS'])} на клиента.
            Имя и ссылка на запись подставятся каждому.
          </p>
        </section>

        <section className={sheet.group} aria-label='Поздравления'>
          <div className={sheet.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>Поздравлять с днём рождения</span>
              <Switch
                checked={Boolean(overview?.birthdayGreeting)}
                onCheckedChange={(checked) => void toggleBirthday(checked)}
              />
            </label>
          </div>
          <p className={sheet.groupFooter}>
            Каждый год в 11:00 в день рождения — одно SMS клиенту, у которого он указан в карточке.
          </p>
        </section>

        {overview && overview.history.length > 0 && (
          <section className={sheet.group} aria-label='Отправленные'>
            <SectionCaption>Отправленные</SectionCaption>
            <div className={sheet.list}>
              {overview.history.slice(0, 5).map((item) => (
                <div key={item.id} className={sheet.row}>
                  <span className={sheet.rowLabel}>
                    {SEGMENTS.find((option) => option.value === item.segment)?.label} ·{' '}
                    {new Date(item.createdAt).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                      timeZone: BUSINESS_TIME_ZONE,
                    })}
                  </span>
                  <span>{pluralize(item.recipients, ['клиент', 'клиента', 'клиентов'])}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </form>
    </Sheet>
  )
}
