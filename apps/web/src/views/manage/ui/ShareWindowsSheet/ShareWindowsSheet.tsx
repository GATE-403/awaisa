'use client'

import { Button } from '@awaisa/ui/Button'
import { Select } from '@awaisa/ui/Select'
import { useToast } from '@awaisa/ui/Toast'
import { ph } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { ArrowUpRight, Copy, TelegramLogo, WhatsappLogo } from '@phosphor-icons/react/ssr'
import { useState } from 'react'
import { formatClock } from '@/entities/business'
import type { AdminSchedule, Catalog } from '@/shared/api/types'
import { copyText } from '@/shared/lib/share'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { GlyphGroup } from '@/shared/ui/GlyphGroup/GlyphGroup'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import { freeGaps } from '@/widgets/DayCalendar'
import styles from './ShareWindowsSheet.module.css'

interface ShareWindowsSheetProps {
  slug: string
  schedule: AdminSchedule
  catalog: Catalog
  /** The business hours that day (masters without their own follow them). */
  dayHours: { opensMinutes: number; closesMinutes: number } | null
  /** "Thu 19 November". */
  dayLabel: string
  /** On today, only what is still ahead. */
  nowMinutes: number | null
  slotMinutes: number
  onClose: () => void
}

const SHORTEST_FALLBACK = 30
const ANY_SERVICE = 'any'

type Window = { from: number; to: number; names: string[] }

// The day's free time as a ready message for clients: windows in the order of the day, each with
// the masters free then (a client asks "when", not "with whom"), for any service or one chosen -
// then only the windows it fits and a link straight to it - and sent in one tap to WhatsApp or
// Telegram, or copied.
export const ShareWindowsSheet = ({
  slug,
  schedule,
  catalog,
  dayHours,
  dayLabel,
  nowMinutes,
  slotMinutes,
  onClose,
}: ShareWindowsSheetProps) => {
  const toast = useToast()
  const { t } = useLingui()
  const [serviceId, setServiceId] = useState<string>(ANY_SERVICE)
  const services = catalog.services.filter((service) => service.isActive !== false)
  const service = services.find((item) => item.id === serviceId) ?? null

  const windows = new Map<string, Window>()
  for (const specialist of schedule.specialists) {
    if (specialist.isOnLeave) continue
    const master = catalog.specialists.find((item) => item.id === specialist.id)
    const theirs = services.filter((item) => master?.serviceIds.includes(item.id))
    if (service && !theirs.some((item) => item.id === service.id)) continue
    const durations = theirs.map((item) => item.durationMinutes)
    const minMinutes = service
      ? service.durationMinutes
      : durations.length > 0
        ? Math.min(...durations)
        : SHORTEST_FALLBACK
    const gaps = freeGaps({
      day: specialist.hours === undefined ? dayHours : specialist.hours,
      bookings: schedule.bookings.filter((booking) => booking.specialistId === specialist.id),
      timeOff: schedule.timeOff.filter((item) => item.specialistId === specialist.id),
      from: nowMinutes,
      slotMinutes,
      minMinutes,
    })
    for (const gap of gaps) {
      const key = `${gap.from}-${gap.to}`
      const entry = windows.get(key) ?? { from: gap.from, to: gap.to, names: [] }
      entry.names.push(specialist.name.split(' ')[0])
      windows.set(key, entry)
    }
  }
  const lines = [...windows.values()]
    .sort((first, second) => first.from - second.from || first.to - second.to)
    .map(({ from, to, names }) => `${formatClock(from)}–${formatClock(to)} - ${names.join(', ')}`)

  const day =
    nowMinutes !== null ? t`today, ${ph({ date: dayLabel.split(', ').pop() ?? '' })}` : dayLabel
  const query = `${service ? `service=${service.id}&` : ''}date=${schedule.date}`
  const path = `/${slug}/book?${query}`
  const link = typeof window === 'undefined' ? path : `${window.location.origin}${path}`
  const heading = service
    ? t`Free time for “${ph({ service: service.name })}” · ${day}`
    : t`Free time · ${day}`
  const body = [heading, ...lines].join('\n')
  // Shown without the query: "awaisa.kg/kings-barbershop/book".
  const shortLink =
    typeof window === 'undefined' ? `${slug}/book` : `${window.location.host}/${slug}/book`
  const text = `${body}\n\n${t`Book online: ${link}`}`

  const handleCopy = async () => {
    const isCopied = await copyText(text)
    if (isCopied) toast.show({ title: t`Copied: paste it into a chat or a story`, type: 'success' })
    else toast.show({ title: t`Could not copy`, type: 'error' })
  }

  return (
    <Sheet
      title={t`Free slots`}
      onClose={onClose}
      cancelLabel={null}
      action={{ label: t`Done`, onClick: onClose }}
    >
      {/* One group: the service, the message as the client will read it, the link - then one
          wide action (copy) with the messengers as thin glyphs beside it. */}
      <div className={sheet.group}>
        <section className={sheet.list} aria-label={t`Message for clients`}>
          <div className={sheet.row}>
            <span className={sheet.rowLabel}>{t`Service`}</span>
            <Select
              aria-label={t`Service`}
              variant='plain'
              value={serviceId}
              items={[
                {
                  value: ANY_SERVICE,
                  label: t({ message: 'Any', context: 'any service, feminine' }),
                },
                ...services.map((item) => ({ value: item.id, label: item.name })),
              ]}
              onValueChange={(value) => value && setServiceId(value)}
            />
          </div>
          {lines.length > 0 && (
            <>
              <p className={styles.message}>{body}</p>
              <a className={sheet.row} href={link} target='_blank' rel='noreferrer'>
                <span className={sheet.rowLabel}>{t`Link`}</span>
                <span className={styles.link}>
                  <span className={styles.linkText}>{shortLink}</span>
                  <ArrowUpRight aria-hidden />
                </span>
              </a>
            </>
          )}
        </section>
        {lines.length === 0 ? (
          <EmptyState
            variant='inline'
            text={service ? t`No slot for this service on this day.` : t`No free time on this day.`}
          />
        ) : (
          <p className={sheet.groupFooter}>{t`The client sees this text and the booking link.`}</p>
        )}
      </div>

      {lines.length > 0 && (
        <div className={styles.send}>
          <Button className={styles.copy} onClick={() => void handleCopy()}>
            <Copy aria-hidden />
            {t`Copy`}
          </Button>
          <GlyphGroup label={t`Send to a messenger`}>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(text)}`}
              target='_blank'
              rel='noreferrer'
              title='WhatsApp'
            >
              <WhatsappLogo aria-hidden />
              <span className={styles.srOnly}>WhatsApp</span>
            </a>
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(body)}`}
              target='_blank'
              rel='noreferrer'
              title='Telegram'
            >
              <TelegramLogo aria-hidden />
              <span className={styles.srOnly}>Telegram</span>
            </a>
          </GlyphGroup>
        </div>
      )}
    </Sheet>
  )
}
