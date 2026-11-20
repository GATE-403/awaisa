'use client'

import { Select } from '@awaisa/ui/Select'
import { useToast } from '@awaisa/ui/Toast'
import { ArrowUpRight, Copy, TelegramLogo, WhatsappLogo } from '@phosphor-icons/react/ssr'
import { useState } from 'react'
import { formatClock } from '@/entities/business'
import type { AdminSchedule, Catalog } from '@/shared/api/types'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { GlyphButton, GlyphGroup } from '@/shared/ui/GlyphGroup/GlyphGroup'
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
  /** «чт, 19 ноября». */
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
// the masters free then (a client asks «when», not «with whom»), for any service or one chosen —
// then only the windows it fits and a link straight to it — and sent in one tap to WhatsApp or
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
    .map(({ from, to, names }) => `${formatClock(from)}–${formatClock(to)} — ${names.join(', ')}`)

  const day = nowMinutes !== null ? `сегодня, ${dayLabel.split(', ').pop()}` : dayLabel
  const query = `${service ? `service=${service.id}&` : ''}date=${schedule.date}`
  const path = `/${slug}/book?${query}`
  const link = typeof window === 'undefined' ? path : `${window.location.origin}${path}`
  const heading = service
    ? `Свободное время на «${service.name}» · ${day}`
    : `Свободное время · ${day}`
  const body = [heading, ...lines].join('\n')
  // Shown without the query: «awaisa.kg/kings-barbershop/book».
  const shortLink =
    typeof window === 'undefined' ? `${slug}/book` : `${window.location.host}/${slug}/book`
  const text = `${body}\n\nЗапись онлайн: ${link}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      toast.show({ title: 'Скопировано — вставьте в чат или сторис', type: 'success' })
    } catch {
      toast.show({ title: 'Не получилось скопировать', type: 'error' })
    }
  }

  return (
    <Sheet
      title='Свободные окна'
      onClose={onClose}
      cancelLabel={null}
      action={{ label: 'Готово', onClick: onClose }}
    >
      <section className={sheet.list} aria-label='Для какой услуги'>
        <div className={sheet.row}>
          <span className={sheet.rowLabel}>Услуга</span>
          <Select
            aria-label='Услуга'
            variant='plain'
            value={serviceId}
            items={[
              { value: ANY_SERVICE, label: 'Любая' },
              ...services.map((item) => ({ value: item.id, label: item.name })),
            ]}
            onValueChange={(value) => value && setServiceId(value)}
          />
        </div>
      </section>

      {lines.length === 0 ? (
        <EmptyState
          variant='inline'
          text={
            service
              ? 'На этот день окна под эту услугу нет.'
              : 'На этот день свободного времени нет.'
          }
        />
      ) : (
        <>
          {/* The message as the client will read it — plain text, no box — then the link on a
              row of its own, then the ways to send it as one capsule of thin glyphs. */}
          <p className={styles.message}>{body}</p>
          <section className={sheet.list} aria-label='Ссылка на запись'>
            <a className={sheet.row} href={link} target='_blank' rel='noreferrer'>
              <span className={sheet.rowLabel}>Ссылка</span>
              <span className={styles.link}>
                <span className={styles.linkText}>{shortLink}</span>
                <ArrowUpRight aria-hidden />
              </span>
            </a>
          </section>
          <div className={styles.send}>
            <span className={styles.sendLabel}>Отправить клиентам</span>
            <GlyphGroup label='Отправить клиентам'>
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
              <GlyphButton
                icon={<Copy aria-hidden />}
                label='Скопировать'
                onClick={() => void handleCopy()}
              />
            </GlyphGroup>
          </div>
        </>
      )}
    </Sheet>
  )
}
