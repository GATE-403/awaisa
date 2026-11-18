'use client'

import { Button } from '@awaisa/ui/Button'
import { Skeleton } from '@awaisa/ui/Skeleton'
import { useToast } from '@awaisa/ui/Toast'
import { BellRinging, Coffee, Plus } from '@phosphor-icons/react/ssr'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { formatPrice, getDaysAround } from '@/entities/booking'
import { findDay, weekdayOf } from '@/entities/business'
import { getErrorMessage } from '@/shared/api/apiError'
import {
  closeDay,
  getManagedWaitlist,
  getUnclosedVisits,
  removeManagedWaitlist,
  reopenVisits,
} from '@/shared/api/clientApi'
import type { AdminBooking, Business, Catalog, ManagedWaitlistEntry } from '@/shared/api/types'
import { useToday } from '@/shared/lib/hooks/useToday'
import { pluralize, pluralWord } from '@/shared/lib/plural'
import { trackToastAction } from '@/shared/lib/telemetry'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { useAdminSchedule } from '@/views/manage/model/useAdminSchedule'
import { useCanSeeMoney } from '@/views/manage/model/useManageRole'
import { BookingDetailsDialog } from '@/views/manage/ui/BookingDetailsDialog/BookingDetailsDialog'
import { ClientSheet } from '@/views/manage/ui/ClientSheet/ClientSheet'
import { NewBookingDialog } from '@/views/manage/ui/NewBookingDialog/NewBookingDialog'
import { NowBar } from '@/views/manage/ui/NowBar/NowBar'
import { SectionHeader } from '@/views/manage/ui/SectionHeader/SectionHeader'
import { TimeOffDialog } from '@/views/manage/ui/TimeOffDialog/TimeOffDialog'
import { WaitlistSheet } from '@/views/manage/ui/WaitlistSheet/WaitlistSheet'
import { DayCalendar, getMasterTint } from '@/widgets/DayCalendar'
import { DayStrip } from '@/widgets/DayStrip'
import styles from './ScheduleTab.module.css'

interface ScheduleTabProps {
  slug: string
  business: Business
  catalog: Catalog
  /** Bumped when a new booking arrives, so the open day reloads. */
  refreshKey: number
}

type Draft = {
  specialistId: string
  time: string | null
  initial?: { serviceId: string; name: string; phone: string }
}

const DAYS_SHOWN = 14
// Two weeks back: enough to close yesterday's and last week's visits.
const PAST_DAYS = 14

export const ScheduleTab = ({ slug, business, catalog, refreshKey }: ScheduleTabProps) => {
  const today = useToday()
  const canSeeMoney = useCanSeeMoney()
  const toast = useToast()
  const [unclosed, setUnclosed] = useState<{
    total: number
    days: { date: string; count: number }[]
  }>({
    total: 0,
    days: [],
  })
  const searchParams = useSearchParams()
  const router = useRouter()
  const linkedDate = searchParams.get('date')
  const linkedBookingId = searchParams.get('booking')
  const [selectedDay, setSelectedDay] = useState<string | null>(linkedDate)
  const [isClosingTime, setIsClosingTime] = useState(false)
  const [selected, setSelected] = useState<AdminBooking | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [clientPhone, setClientPhone] = useState<string | null>(null)
  const [waitlist, setWaitlist] = useState<ManagedWaitlistEntry[]>([])
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false)
  const date = selectedDay ?? today?.dayKey ?? null
  const days = today ? getDaysAround(today.dayKey, PAST_DAYS, DAYS_SHOWN) : []
  const isPast = date !== null && today !== null && date < today.dayKey
  const {
    schedule,
    error,
    reload,
    addBooking,
    moveBooking,
    cancelBooking,
    markOutcome,
    addTimeOff,
    removeTimeOff,
  } = useAdminSchedule(slug, date, refreshKey)
  const dayLabel = days.find((day) => day.key === date)?.label ?? ''
  const confirmed = schedule?.bookings.filter((booking) => booking.status === 'confirmed') ?? []
  // What the day brings: paid amounts once marked, prices otherwise; no-shows bring nothing.
  const revenue = confirmed.reduce(
    (sum, booking) =>
      booking.outcome === 'no_show' ? sum : sum + (booking.paidAmount ?? booking.price),
    0,
  )
  const dayHours = date ? (findDay(business.hours, weekdayOf(date)) ?? null) : null
  // The day as a title, its numbers in one line under it with the figures in bold.
  const summary = (
    <>
      <span className={styles.dayTitle}>{dayLabel}</span>
      <span className={styles.dayStats}>
        {!dayHours ? (
          'Выходной'
        ) : confirmed.length === 0 ? (
          'Записей нет'
        ) : (
          <>
            <strong>{confirmed.length}</strong>{' '}
            {pluralWord(confirmed.length, ['запись', 'записи', 'записей'])}
          </>
        )}
        {canSeeMoney && revenue > 0 && (
          <>
            {' · '}
            <strong>{formatPrice(revenue)}</strong>
          </>
        )}
      </span>
    </>
  )
  const hasMasters = (schedule?.specialists.length ?? 0) > 0
  const marks = new Set(unclosed.days.map((day) => day.date))
  const firstUnclosed = unclosed.days.find((day) => day.date !== date)
  const openHere = unclosed.days.find((day) => day.date === date)?.count ?? 0
  const dayWaitlist = waitlist.filter((entry) => entry.date === date)

  // Arrived from a «Новая запись» toast or notification: show that day and open the booking once.
  useEffect(() => {
    if (linkedDate) setSelectedDay(linkedDate)
  }, [linkedDate])

  // biome-ignore lint/correctness/useExhaustiveDependencies: router is stable
  useEffect(() => {
    if (!linkedBookingId || !schedule) return
    const booking = schedule.bookings.find((item) => item.id === linkedBookingId)
    if (!booking) return
    setSelected(booking)
    router.replace(`/manage/${slug}?tab=schedule`, { scroll: false })
  }, [linkedBookingId, schedule, slug])

  // Re-read after every schedule change: marking a visit may close a day, booking someone in
  // takes them off the waitlist.
  useEffect(() => {
    if (!schedule) return
    const controller = new AbortController()
    getManagedWaitlist(slug, controller.signal)
      .then(setWaitlist)
      .catch(() => undefined)
    getUnclosedVisits(slug, controller.signal)
      .then(setUnclosed)
      .catch(() => undefined)

    return () => controller.abort()
  }, [slug, schedule])

  // A waiting client goes straight into the new-booking sheet: their service, name and number,
  // the freed time if they were texted one, their master or the first who does the service.
  const handleBookFromWaitlist = (entry: ManagedWaitlistEntry) => {
    const masterId =
      entry.specialist?.id ??
      catalog.specialists.find((master) => master.serviceIds.includes(entry.service.id))?.id ??
      schedule?.specialists[0]?.id ??
      ''
    setIsWaitlistOpen(false)
    setDraft({
      specialistId: masterId,
      time: entry.notifiedTime,
      initial: {
        serviceId: entry.service.id,
        name: entry.customerName,
        phone: entry.customerPhone,
      },
    })
  }

  const handleRemoveFromWaitlist = async (entry: ManagedWaitlistEntry) => {
    try {
      await removeManagedWaitlist(slug, entry.id)
      setWaitlist((current) => current.filter((item) => item.id !== entry.id))
      toast.show({ title: `${entry.customerName} больше не ждёт`, type: 'success' })
    } catch (removeError) {
      toast.show({
        title: 'Не получилось',
        description: getErrorMessage(removeError),
        type: 'error',
      })
    }
  }

  // Most visits happen as booked: close the whole day in one tap, undo from the toast.
  const handleCloseDay = async () => {
    if (!date) return
    try {
      const { ids } = await closeDay(slug, date)
      reload()
      toast.show({
        title: `Отмечено: ${pluralize(ids.length, ['визит', 'визита', 'визитов'])}`,
        description: 'Все пришли, оплата по прайсу наличными — поправьте, где было иначе',
        type: 'success',
        action: {
          label: 'Вернуть',
          onClick: () => {
            trackToastAction('staff_undo_close_day')
            void reopenVisits(slug, ids).then(reload)
          },
        },
      })
    } catch (closeError) {
      toast.show({
        title: 'Не получилось',
        description: getErrorMessage(closeError),
        type: 'error',
      })
    }
  }

  const handleCreate = (specialistId: string, time: string | null) => {
    if (isPast) {
      toast.show({ title: 'Записать в прошедший день нельзя', type: 'info' })
      return
    }
    setDraft({ specialistId, time })
  }

  return (
    <section className={styles.content} aria-label='Расписание'>
      <SectionHeader
        title='Расписание'
        description={
          <>
            {schedule ? summary : <span className={styles.dayTitle}>{dayLabel}</span>}
            {/* Day states read as part of the hint, not as more buttons beside the actions.
                Here, not above the calendar: they load late and must not shift the grid. */}
            {unclosed.total > openHere && (
              <button
                type='button'
                className={styles.statusLink}
                onClick={() => setSelectedDay((firstUnclosed ?? unclosed.days[0])?.date ?? null)}
                title='Отметьте, кто пришёл: так выручка в аналитике будет точной'
              >
                <span className={styles.statusDot} aria-hidden />
                Не закрыто: {pluralize(unclosed.total - openHere, ['визит', 'визита', 'визитов'])} ›
              </button>
            )}
            {!isPast && dayWaitlist.length > 0 && (
              <button
                type='button'
                className={styles.statusLink}
                onClick={() => setIsWaitlistOpen(true)}
              >
                <BellRinging weight='fill' aria-hidden />
                Ждут окна: {dayWaitlist.length} ›
              </button>
            )}
          </>
        }
        actions={
          hasMasters && (
            <>
              {openHere > 0 && (
                <Button variant='secondary' size='sm' onClick={handleCloseDay}>
                  Все пришли ({openHere})
                </Button>
              )}
              {!isPast && (
                <>
                  <Button variant='secondary' size='sm' onClick={() => setIsClosingTime(true)}>
                    <Coffee weight='bold' aria-hidden />
                    Перерыв
                  </Button>
                  <Button
                    size='sm'
                    onClick={() =>
                      setDraft({ specialistId: schedule?.specialists[0]?.id ?? '', time: null })
                    }
                  >
                    <Plus weight='bold' aria-hidden />
                    Новая запись
                  </Button>
                </>
              )}
            </>
          )
        }
      />

      {error && (
        <div className={styles.error} role='alert'>
          <p>{error}</p>
          <Button variant='link' size='sm' onClick={reload}>
            Повторить
          </Button>
        </div>
      )}

      <div className={styles.panel}>
        <DayStrip days={days} value={date} onChange={setSelectedDay} marks={marks} />
        {schedule && hasMasters && today && date === today.dayKey && (
          <NowBar bookings={schedule.bookings} nowMinutes={today.minutes} onOpen={setSelected} />
        )}
        {!schedule && !error && <Skeleton className={styles.skeleton} />}

        {schedule && !hasMasters && (
          <EmptyState
            title='Добавьте мастеров'
            text='Откройте раздел «Мастера» и добавьте хотя бы себя — здесь появится расписание.'
          />
        )}

        {schedule && hasMasters && (
          <DayCalendar
            specialists={schedule.specialists}
            bookings={schedule.bookings}
            timeOff={schedule.timeOff}
            hours={dayHours}
            nowMinutes={today && date === today.dayKey ? today.minutes : null}
            isPast={isPast}
            slotMinutes={business.slotMinutes}
            onSelectBooking={setSelected}
            onRemoveTimeOff={removeTimeOff}
            onCreateBooking={handleCreate}
            onMoveBooking={moveBooking}
          />
        )}
      </div>

      {selected && (
        <BookingDetailsDialog
          slug={slug}
          key={selected.id}
          booking={selected}
          dayLabel={dayLabel}
          tint={getMasterTint(
            Math.max(
              0,
              (schedule?.specialists ?? []).findIndex(({ id }) => id === selected.specialistId),
            ),
          )}
          onClose={() => setSelected(null)}
          onCancel={cancelBooking}
          onOutcome={today && date && date <= today.dayKey ? markOutcome : undefined}
          onOpenClient={(phone) => {
            setSelected(null)
            setClientPhone(phone)
          }}
        />
      )}

      {clientPhone && (
        <ClientSheet slug={slug} phone={clientPhone} onClose={() => setClientPhone(null)} />
      )}

      {draft && schedule && date && (
        <NewBookingDialog
          date={date}
          dayLabel={dayLabel}
          time={draft.time}
          specialistId={draft.specialistId}
          specialists={schedule.specialists}
          catalog={catalog}
          initial={draft.initial}
          onClose={() => setDraft(null)}
          onSubmit={addBooking}
        />
      )}

      {isWaitlistOpen && (
        <WaitlistSheet
          dayLabel={dayLabel}
          entries={dayWaitlist}
          onBook={handleBookFromWaitlist}
          onRemove={(entry) => void handleRemoveFromWaitlist(entry)}
          onClose={() => setIsWaitlistOpen(false)}
        />
      )}

      {isClosingTime && schedule && date && (
        <TimeOffDialog
          date={date}
          dayLabel={dayLabel}
          specialists={schedule.specialists}
          onClose={() => setIsClosingTime(false)}
          onSubmit={addTimeOff}
        />
      )}
    </section>
  )
}
