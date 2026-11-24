'use client'

import { Button, ButtonLink } from '@awaisa/ui/Button'
import { Select } from '@awaisa/ui/Select'
import { Switch } from '@awaisa/ui/Switch'
import { useToast } from '@awaisa/ui/Toast'
import { ph } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { ArrowsClockwise, Copy, GoogleLogo } from '@phosphor-icons/react/ssr'
import { useState } from 'react'
import { getErrorMessage } from '@/shared/api/apiError'
import { formatDate, type Locale, useLocale } from '@/shared/i18n'
import { haptic } from '@/shared/lib/nativeBridge'
import { copyText } from '@/shared/lib/share'
import { GlyphButton, GlyphGroup } from '@/shared/ui/GlyphGroup/GlyphGroup'
import { RowNote } from '@/shared/ui/RowNote/RowNote'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import { HIDDEN_PHONE_NOTE } from '../../config/copy'
import { type FeedScope, toGoogleCalendar, toWebcal } from '../../lib/feedLinks'
import type { useCalendarFeed } from '../../model/useCalendarFeed'
import styles from './CalendarFeedGroup.module.css'

type Master = { id: string; name: string }

interface CalendarFeedSheetProps {
  scope: FeedScope
  state: ReturnType<typeof useCalendarFeed>
  /** A business feed may show one master; none for a master's own feed. */
  masters?: Master[]
  /** Whole phone numbers are the owner's call for the whole business. */
  canSetPhones?: boolean
  onClose: () => void
}

const ALL = 'all'

const formatReadTime = (date: Date, locale: Locale) =>
  formatDate(locale, date, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

// «Calendar on your phone»: subscribe once and the visits stay in the phone's own calendar. The
// address is secret and shown only when made, so a device without it asks for a new one.
export const CalendarFeedSheet = ({
  scope,
  state,
  masters = [],
  canSetPhones = false,
  onClose,
}: CalendarFeedSheetProps) => {
  const toast = useToast()
  const { t } = useLingui()
  const locale = useLocale()
  const { feed, url, issue, setMaster, setPhones } = state
  const [isBusy, setIsBusy] = useState(false)
  const [specialistId, setSpecialistId] = useState<string | null>(feed?.specialistId ?? null)
  const isBusiness = scope.kind === 'business'

  const run = async (action: () => Promise<void>) => {
    setIsBusy(true)
    try {
      await action()
    } catch (error) {
      toast.show({
        title: t`Something went wrong`,
        description: getErrorMessage(error),
        type: 'error',
      })
    } finally {
      setIsBusy(false)
    }
  }

  const handleIssue = () =>
    run(async () => {
      const wasActive = Boolean(feed?.isActive)
      await issue(specialistId)
      haptic('success')
      if (wasActive)
        toast.show({
          title: t`The link has changed, the old one no longer works`,
          type: 'success',
        })
    })

  const handleMaster = (next: string) => {
    const value = next === ALL ? null : next
    setSpecialistId(value)
    if (feed?.isActive) void run(() => setMaster(value))
  }

  const handleCopy = async () => {
    if (!url) return
    const isCopied = await copyText(url)
    if (isCopied) toast.show({ title: t`Link copied`, type: 'success' })
    else toast.show({ title: t`Could not copy`, type: 'error' })
  }

  const status = (() => {
    if (!feed?.isActive) return null
    if (feed.lastReadAt)
      return t`Calendar last updated ${ph({ date: formatReadTime(new Date(feed.lastReadAt), locale) })}.`
    if (!url) return t`The link was issued on another device. A new one turns the old one off.`
    return null
  })()

  return (
    <Sheet title={t`Calendar on your phone`} onClose={onClose} cancelLabel={t`Close`}>
      <div className={sheet.form}>
        <p className={styles.intro}>
          {isBusiness
            ? t`Bookings from a month back to three months ahead will appear in iPhone or Google Calendar and update themselves. Cancellations stay crossed out.`
            : t`Your bookings from a month back to three months ahead will appear in iPhone or Google Calendar and update themselves. Cancellations stay crossed out.`}
        </p>

        {isBusiness && (
          <section className={sheet.group} aria-label={t`What to show`}>
            <SectionCaption>{t`What to show`}</SectionCaption>
            <div className={sheet.list}>
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>{t`Specialist`}</span>
                <Select
                  variant='plain'
                  aria-label={t`Specialist`}
                  value={specialistId ?? ALL}
                  disabled={isBusy}
                  items={[
                    { value: ALL, label: t`All specialists` },
                    ...masters.map((master) => ({ value: master.id, label: master.name })),
                  ]}
                  onValueChange={(value) => handleMaster(String(value))}
                />
              </div>
              {canSetPhones && (
                <label className={sheet.row}>
                  <span className={sheet.rowLabel}>{t`Full client numbers`}</span>
                  <Switch
                    checked={feed?.isPhoneShown ?? false}
                    disabled={isBusy || !feed}
                    onCheckedChange={(isOn) => void run(() => setPhones(isOn))}
                  />
                </label>
              )}
            </div>
            {canSetPhones && (
              <RowNote>
                {t(HIDDEN_PHONE_NOTE)} {t`Applies to all of the business's calendars.`}
              </RowNote>
            )}
          </section>
        )}

        {status && <RowNote>{status}</RowNote>}

        <div className={styles.actions}>
          {url ? (
            <>
              <GlyphGroup label={t`More`}>
                <GlyphButton
                  icon={<GoogleLogo />}
                  label={t`Add to Google Calendar`}
                  onClick={() => window.open(toGoogleCalendar(url), '_blank', 'noopener')}
                />
                <GlyphButton
                  icon={<Copy />}
                  label={t`Copy link`}
                  onClick={() => void handleCopy()}
                />
                <GlyphButton
                  icon={<ArrowsClockwise />}
                  label={t`Change the link`}
                  disabled={isBusy}
                  onClick={() => void handleIssue()}
                />
              </GlyphGroup>
              {/* The sheet's main action comes last: nothing follows it. */}
              <ButtonLink href={toWebcal(url)} size='sm' className={styles.primary}>
                {t`Subscribe`}
              </ButtonLink>
            </>
          ) : (
            <Button
              type='button'
              size='sm'
              className={styles.primary}
              disabled={isBusy || !feed}
              onClick={() => void handleIssue()}
            >
              {feed?.isActive ? t`Get a new link` : t`Get the link`}
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  )
}
