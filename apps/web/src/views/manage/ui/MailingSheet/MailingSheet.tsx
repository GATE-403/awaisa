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
import { useT } from '@/shared/i18n'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { SegmentedControl } from '@/shared/ui/SegmentedControl/SegmentedControl'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import { formatMomentDay } from '@/views/manage/ui/ClientSheet/BirthdayField'
import { TemplateField } from '@/views/manage/ui/TemplateField/TemplateField'
import styles from './MailingSheet.module.css'

interface MailingSheetProps {
  slug: string
  businessName: string
  /** The segment it opens on (a clients tab's "Invite"); "Lapsed" by default. */
  initialSegment?: MailingSegment
  onClose: () => void
}

const FORM_ID = 'mailing-form'

const SEGMENTS: { value: MailingSegment; label: string }[] = [
  { value: 'lapsed', label: 'Lapsed' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'all', label: 'All' },
]

const LAPSED_DAYS = [30, 60, 90, 180]

// How a template reads for one client (older templates' Russian keys too, as the API fills them).
const fillSample = (text: string, link: string) =>
  text.replace(/\{(?:name|имя)\}/giu, 'Aigerim').replace(/\{(?:link|ссылка)\}/giu, link)

const templates = (name: string): Record<MailingSegment, string> => ({
  lapsed: `{name}, we haven't seen you at ${name} for a while! Book when it suits you: {link}`,
  birthday: `{name}, your birthday is coming up! ${name} gives you 10% off a visit these days: {link}`,
  all: `{name}, news from ${name}: {link}`,
})

// The placeholders a mailing takes, as pills in the shared template editor (the same as replies).
// The keys are what the API fills in; it still reads `{имя}` and `{ссылка}` of older templates.
const MAILING_TOKENS = [
  { key: 'name', aliases: ['имя'], label: 'Client name' },
  { key: 'link', aliases: ['ссылка'], label: 'Booking link' },
] as const

// An SMS in plain Latin (GSM-7) holds 160 characters, 153 per part when longer; any other
// character (Cyrillic, emoji, curly quotes) turns it into UCS-2: 70, then 67 per part.
const smsParts = (text: string) => {
  const [single, part] = /^[\x20-\x7E\n]*$/.test(text) ? [160, 153] : [70, 67]
  return text.length <= single ? 1 : Math.ceil(text.length / part)
}

// A mailing in three choices: whom, what, send. The count is known before sending.
export const MailingSheet = ({
  slug,
  businessName,
  initialSegment = 'lapsed',
  onClose,
}: MailingSheetProps) => {
  const t = useT()
  const toast = useToast()
  const [segment, setSegment] = useState<MailingSegment>(initialSegment)
  const [days, setDays] = useState(60)
  const [text, setText] = useState(templates(businessName)[initialSegment])
  const [preview, setPreview] = useState<{ count: number; names: string[] } | null>(null)
  const [overview, setOverview] = useState<MailingsOverview | null>(null)
  const [isSending, setIsSending] = useState(false)
  // How it reads for one client; the SMS parts are counted with the link as it is sent.
  const sample = fillSample(text, `awaisa.kg/${slug}/book`)
  const sent = fillSample(text, `https://awaisa.kg/${slug}/book`)

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
        title: t('Sent to {clients}', {
          clients: t.count(result.recipients, ['client', 'clients']),
        }),
        type: 'success',
      })
      onClose()
    } catch (error) {
      toast.show({ title: t('Not sent'), description: getErrorMessage(error), type: 'error' })
    } finally {
      setIsSending(false)
    }
  }

  const toggleBirthday = async (isOn: boolean) => {
    try {
      const greeting = isOn
        ? `{name}, happy birthday! ${businessName} is looking forward to seeing you: {link}`
        : null
      await setBirthdayGreeting(slug, greeting)
      setOverview((current) => (current ? { ...current, birthdayGreeting: greeting } : current))
      toast.show({
        title: isOn ? t('Greetings on') : t('Greetings off'),
        type: 'success',
      })
    } catch (error) {
      toast.show({ title: t('Not saved'), description: getErrorMessage(error), type: 'error' })
    }
  }

  return (
    <Sheet
      title={t('Mailing')}
      onClose={onClose}
      action={{
        label: isSending ? t('Sending…') : t('Send'),
        form: FORM_ID,
        disabled: !preview?.count || isSending || text.trim().length < 10,
      }}
    >
      <form id={FORM_ID} className={sheet.form} onSubmit={handleSubmit}>
        <SegmentedControl
          label={t('To')}
          value={segment}
          items={SEGMENTS.map((item) => ({ ...item, label: t(item.label) }))}
          onChange={changeSegment}
        />

        <section className={sheet.group} aria-label={t('To')}>
          <div className={sheet.list}>
            {segment === 'lapsed' && (
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>{t('Not seen for')}</span>
                <span className={sheet.rowControl}>
                  <Select
                    variant='plain'
                    aria-label={t('Not seen for longer than')}
                    items={LAPSED_DAYS.map((value) => ({
                      value,
                      label: t.count(value, ['day', 'days']),
                    }))}
                    value={days}
                    onValueChange={(value) => value && setDays(value)}
                  />
                </span>
              </div>
            )}
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Recipients')}</span>
              <span className={styles.count} aria-live='polite'>
                {preview === null ? '…' : t.count(preview.count, ['client', 'clients'])}
              </span>
            </div>
          </div>
          <p className={sheet.groupFooter}>
            {preview && preview.names.length > 0
              ? t('{names}. Only those who kept SMS on.', {
                  names:
                    preview.count > preview.names.length
                      ? t('{names} and others', { names: preview.names.join(', ') })
                      : preview.names.join(', '),
                })
              : segment === 'birthday'
                ? t('Birthdays in the coming week: from the client cards.')
                : t('Only clients who kept SMS on.')}
          </p>
        </section>

        <section className={sheet.group} aria-label={t('Text')}>
          <SectionCaption>{t('Text')}</SectionCaption>
          <div className={sheet.list}>
            <TemplateField
              label={t('Mailing text')}
              value={text}
              onChange={setText}
              tokens={MAILING_TOKENS}
              placeholder={t('Write the mailing text')}
              preview={sample}
            />
          </div>
          <p className={sheet.groupFooter}>
            {t('≈ {chars}, {parts} per client.', {
              chars: t.count(sent.length, ['character', 'characters']),
              parts: t.count(smsParts(sent), ['SMS', 'SMS']),
            })}{' '}
            {t('Each gets their own name and booking link.')}
          </p>
        </section>

        <section className={sheet.group} aria-label={t('Greetings')}>
          <div className={sheet.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Send birthday greetings')}</span>
              <Switch
                checked={Boolean(overview?.birthdayGreeting)}
                onCheckedChange={(checked) => void toggleBirthday(checked)}
              />
            </label>
          </div>
          <p className={sheet.groupFooter}>
            {t(
              'Every year at 11:00 on the birthday: one SMS to each client with it on their card.',
            )}
          </p>
        </section>

        {overview && overview.history.length > 0 && (
          <section className={sheet.group} aria-label={t('Sent')}>
            <SectionCaption>{t('Sent')}</SectionCaption>
            <div className={sheet.list}>
              {overview.history.slice(0, 5).map((item) => (
                <div key={item.id} className={sheet.row}>
                  <span className={sheet.rowLabel}>
                    {t(SEGMENTS.find((option) => option.value === item.segment)?.label ?? '')} ·{' '}
                    {formatMomentDay(item.createdAt, t)}
                  </span>
                  <span>{t.count(item.recipients, ['client', 'clients'])}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </form>
    </Sheet>
  )
}
