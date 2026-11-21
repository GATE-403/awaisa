'use client'

import { Button, ButtonLink } from '@awaisa/ui/Button'
import { Select } from '@awaisa/ui/Select'
import { Switch } from '@awaisa/ui/Switch'
import { useToast } from '@awaisa/ui/Toast'
import { ArrowsClockwise, Copy, GoogleLogo } from '@phosphor-icons/react/ssr'
import { useState } from 'react'
import { getErrorMessage } from '@/shared/api/apiError'
import { BUSINESS_TIME_ZONE } from '@/shared/lib/businessTime'
import { haptic } from '@/shared/lib/nativeBridge'
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

const readTime = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: BUSINESS_TIME_ZONE,
})

// «Календарь на телефоне»: subscribe once and the visits stay in the phone's own calendar. The
// address is secret and shown only when made, so a device without it asks for a new one.
export const CalendarFeedSheet = ({
  scope,
  state,
  masters = [],
  canSetPhones = false,
  onClose,
}: CalendarFeedSheetProps) => {
  const toast = useToast()
  const { feed, url, issue, setMaster, setPhones } = state
  const [isBusy, setIsBusy] = useState(false)
  const [specialistId, setSpecialistId] = useState<string | null>(feed?.specialistId ?? null)
  const isBusiness = scope.kind === 'business'

  const run = async (action: () => Promise<void>) => {
    setIsBusy(true)
    try {
      await action()
    } catch (error) {
      toast.show({ title: 'Не получилось', description: getErrorMessage(error), type: 'error' })
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
        toast.show({ title: 'Ссылка сменилась, старая больше не работает', type: 'success' })
    })

  const handleMaster = (next: string) => {
    const value = next === ALL ? null : next
    setSpecialistId(value)
    if (feed?.isActive) void run(() => setMaster(value))
  }

  const handleCopy = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      toast.show({ title: 'Ссылка скопирована', type: 'success' })
    } catch {
      toast.show({ title: 'Не получилось скопировать', type: 'error' })
    }
  }

  const status = (() => {
    if (!feed?.isActive) return null
    if (feed.lastReadAt)
      return `Календарь обновлялся ${readTime.format(new Date(feed.lastReadAt))}.`
    if (!url) return 'Ссылка выдана на другом устройстве. Новая отключит прежнюю.'
    return null
  })()

  return (
    <Sheet title='Календарь на телефоне' onClose={onClose} cancelLabel='Закрыть'>
      <div className={sheet.form}>
        <p className={styles.intro}>
          {isBusiness ? 'Записи' : 'Ваши записи'} за месяц назад и три вперёд появятся в Календаре
          iPhone или Google и будут обновляться сами. Отмены останутся зачёркнутыми.
        </p>

        {isBusiness && (
          <section className={sheet.group} aria-label='Что показывать'>
            <SectionCaption>Что показывать</SectionCaption>
            <div className={sheet.list}>
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>Мастер</span>
                <Select
                  variant='plain'
                  aria-label='Мастер'
                  value={specialistId ?? ALL}
                  disabled={isBusy}
                  items={[
                    { value: ALL, label: 'Все мастера' },
                    ...masters.map((master) => ({ value: master.id, label: master.name })),
                  ]}
                  onValueChange={(value) => handleMaster(String(value))}
                />
              </div>
              {canSetPhones && (
                <label className={sheet.row}>
                  <span className={sheet.rowLabel}>Номера клиентов целиком</span>
                  <Switch
                    checked={feed?.isPhoneShown ?? false}
                    disabled={isBusy || !feed}
                    onCheckedChange={(isOn) => void run(() => setPhones(isOn))}
                  />
                </label>
              )}
            </div>
            {canSetPhones && (
              <RowNote>{HIDDEN_PHONE_NOTE} Касается всех календарей бизнеса.</RowNote>
            )}
          </section>
        )}

        {status && <RowNote>{status}</RowNote>}

        <div className={styles.actions}>
          {url ? (
            <>
              <GlyphGroup label='Ещё'>
                <GlyphButton
                  icon={<GoogleLogo />}
                  label='Добавить в Google Календарь'
                  onClick={() => window.open(toGoogleCalendar(url), '_blank', 'noopener')}
                />
                <GlyphButton
                  icon={<Copy />}
                  label='Скопировать ссылку'
                  onClick={() => void handleCopy()}
                />
                <GlyphButton
                  icon={<ArrowsClockwise />}
                  label='Сменить ссылку'
                  disabled={isBusy}
                  onClick={() => void handleIssue()}
                />
              </GlyphGroup>
              {/* The sheet's main action comes last: nothing follows it. */}
              <ButtonLink href={toWebcal(url)} size='sm' className={styles.primary}>
                Подписаться
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
              {feed?.isActive ? 'Получить новую ссылку' : 'Получить ссылку'}
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  )
}
