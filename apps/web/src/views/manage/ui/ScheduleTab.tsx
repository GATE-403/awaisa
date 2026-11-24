'use client'

import { Button } from '@awaisa/ui/Button'
import { Menu, MenuItem } from '@awaisa/ui/Menu'
import { Popover } from '@awaisa/ui/Popover'
import { Skeleton } from '@awaisa/ui/Skeleton'
import { useToast } from '@awaisa/ui/Toast'
import {
  ArrowsInLineHorizontal,
  ArrowsOutLineHorizontal,
  BellRinging,
  Coffee,
  Columns,
  MagnifyingGlass,
  Plus,
  Rows,
  ShareNetwork,
  ShoppingBag,
  X,
} from '@phosphor-icons/react/ssr'
import { useRouter, useSearchParams } from 'next/navigation'
import { type ReactNode, useEffect, useState } from 'react'
import { formatPrice, getDaysAround } from '@/entities/booking'
import { findDay, parseClock, weekdayOf } from '@/entities/business'
import { getErrorMessage } from '@/shared/api/apiError'
import {
  closeDay,
  getManagedWaitlist,
  getScheduleLoad,
  getUnclosedVisits,
  removeManagedWaitlist,
  reopenVisits,
} from '@/shared/api/clientApi'
import type { AdminBooking, Business, Catalog, ManagedWaitlistEntry } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { useMediaQuery } from '@/shared/lib/hooks/useMediaQuery'
import { useRootFlag } from '@/shared/lib/hooks/useRootFlag'
import { useToday } from '@/shared/lib/hooks/useToday'
import { trackToastAction } from '@/shared/lib/telemetry'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { GlyphButton, GlyphGroup } from '@/shared/ui/GlyphGroup/GlyphGroup'
import { SegmentedControl } from '@/shared/ui/SegmentedControl/SegmentedControl'
import { useAdminSchedule } from '@/views/manage/model/useAdminSchedule'
import { useCanSeeMoney } from '@/views/manage/model/useManageRole'
import { useHasFeature } from '@/views/manage/model/usePlanAccess'
import { useScheduleLayout, useScheduleWide } from '@/views/manage/model/useScheduleLayout'
import { BookingDetailsDialog } from '@/views/manage/ui/BookingDetailsDialog/BookingDetailsDialog'
import { BookingInspector } from '@/views/manage/ui/BookingInspector/BookingInspector'
import { ClientSheet } from '@/views/manage/ui/ClientSheet/ClientSheet'
import { CloseDayBar } from '@/views/manage/ui/CloseDayBar/CloseDayBar'
import { NewBookingDialog } from '@/views/manage/ui/NewBookingDialog/NewBookingDialog'
import { NowBar } from '@/views/manage/ui/NowBar/NowBar'
import { SaleSheet } from '@/views/manage/ui/SaleSheet/SaleSheet'
import { SectionHeader } from '@/views/manage/ui/SectionHeader/SectionHeader'
import { ShareWindowsSheet } from '@/views/manage/ui/ShareWindowsSheet/ShareWindowsSheet'
import { TimeOffDialog } from '@/views/manage/ui/TimeOffDialog/TimeOffDialog'
import { WaitlistSheet } from '@/views/manage/ui/WaitlistSheet/WaitlistSheet'
import { type CalendarLayout, DayCalendar } from '@/widgets/DayCalendar'
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
  initial?: { serviceId: string | null; name: string; phone: string }
}

const DAYS_SHOWN = 14

// Glyphs, named in a tooltip: a column per master, or a row per master.
const LAYOUTS: { value: CalendarLayout; label: string; icon: ReactNode }[] = [
  { value: 'columns', label: 'Колонки', icon: <Columns aria-hidden /> },
  { value: 'timeline', label: 'Лента', icon: <Rows aria-hidden /> },
]

// «Чт, 19 ноября»: the day in the toolbar's one line.
const capitalizeFirst = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

const dayTitleFormatter = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
})

// Two weeks back: enough to close yesterday's and last week's visits.
const PAST_DAYS = 14

export const ScheduleTab = ({ slug, business, catalog, refreshKey }: ScheduleTabProps) => {
  const { layout, setLayout } = useScheduleLayout()
  const { isWide, setWide } = useScheduleWide()
  const [zoom, setZoom] = useState(1)
  // A visit picked from «N визитов прошли без отметки»: the calendar scrolls to it and flashes it.
  const [focusedBookingId, setFocusedBookingId] = useState<string | null>(null)
  const today = useToday()
  const canSeeMoney = useCanSeeMoney()
  const canSell = useHasFeature('cashdesk')
  const toast = useToast()
  const t = useT()
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
  const [isSharing, setIsSharing] = useState(false)
  const [loads, setLoads] = useState<ReadonlyMap<string, number>>(new Map())
  // «Найти место»: the service whose gaps light up on the day.
  const [fitServiceId, setFitServiceId] = useState<string | null>(null)
  const [selected, setSelected] = useState<AdminBooking | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [clientPhone, setClientPhone] = useState<string | null>(null)
  // Selling products: on its own (null) or with a visit, from its «Итог визита».
  const [sale, setSale] = useState<{ booking: AdminBooking | null } | null>(null)
  const [waitlist, setWaitlist] = useState<ManagedWaitlistEntry[]>([])
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false)
  // «✕» on the bar: hidden until the cabinet is opened again.
  const [isCloseBarHidden, setIsCloseBarHidden] = useState(false)
  const date = selectedDay ?? today?.dayKey ?? null
  const days = today ? getDaysAround(today.dayKey, PAST_DAYS, DAYS_SHOWN) : []
  const isPast = date !== null && today !== null && date < today.dayKey
  const stripFrom = days[0]?.key
  const stripLength = days.length
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
  const dayLabel =
    t.language === 'ru' || !date
      ? (days.find((day) => day.key === date)?.label ?? '')
      : t.dayLong(date)
  const dayTitle = !date
    ? ''
    : t.language === 'ru'
      ? capitalizeFirst(dayTitleFormatter.format(new Date(`${date}T12:00:00`)))
      : t.dayLong(date)
  const confirmed = schedule?.bookings.filter((booking) => booking.status === 'confirmed') ?? []
  // What the day brings: paid amounts once marked, prices otherwise; no-shows bring nothing.
  const revenue = confirmed.reduce(
    (sum, booking) =>
      booking.outcome === 'no_show' ? sum : sum + (booking.paidAmount ?? booking.price),
    0,
  )
  const dayHours = date ? (findDay(business.hours, weekdayOf(date)) ?? null) : null
  const isFinePointer = useMediaQuery('(hover: hover) and (pointer: fine)')
  const isPhone = useMediaQuery('(max-width: 639px)')
  // The schedule fits the window and never scrolls the page: no empty scrollbar gutter beside it.
  useRootFlag('fitted-page')
  // A callback ref: the toolbar mounts only once there are masters, after the first render.
  const [toolbar, setToolbar] = useState<HTMLDivElement | null>(null)
  // On phones the toolbar floats over the window's foot like the tab bar: the day ends above it.
  const [barSpace, setBarSpace] = useState(0)
  // The selected visit's card on the board, for the inspector to point at.
  const selectedCard =
    selected && typeof document !== 'undefined'
      ? document.querySelector(`[data-booking-id="${selected.id}"]`)
      : null
  const fitService = catalog.services.find((service) => service.id === fitServiceId) ?? null
  const fit = fitService
    ? {
        minutes: fitService.durationMinutes,
        specialistIds: catalog.specialists
          .filter((master) => master.serviceIds.includes(fitService.id))
          .map((master) => master.id),
      }
    : null
  // The day as a title, its numbers in one line under it with the figures in bold.
  const summary = (
    <>
      <span className={styles.dayTitle}>{dayTitle}</span>
      <span className={styles.dayStats}>
        {!dayHours ? (
          t('Выходной')
        ) : confirmed.length === 0 ? (
          t('Записей нет')
        ) : (
          <>
            <strong>{confirmed.length}</strong>{' '}
            {/* The figure is bold on its own: only the counted word follows it. */}
            {t.count(confirmed.length, ['запись', 'записи', 'записей']).replace(/^\d+\s/, '')}
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
  // Who those are: the day's ended visits with no outcome yet, in time order.
  const unmarkedHere = (schedule?.bookings ?? [])
    .filter(
      (booking) =>
        booking.status === 'confirmed' &&
        !booking.outcome &&
        booking.payment?.status !== 'pending' &&
        (isPast ||
          (today !== null &&
            date === today.dayKey &&
            parseClock(booking.time) + booking.durationMinutes <= today.minutes)),
    )
    .sort((first, second) => first.time.localeCompare(second.time))
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

  useEffect(() => {
    const bar = toolbar
    if (!isPhone || !bar) {
      setBarSpace(0)
      return
    }
    const measure = () =>
      setBarSpace(Math.max(0, Math.round(window.innerHeight - bar.getBoundingClientRect().top)))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(bar)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [isPhone, toolbar])

  // The wide board spans the window minus the page's own scrollbar, measured while it is on.
  useEffect(() => {
    if (!isWide) return
    const root = document.documentElement
    const measure = () =>
      root.style.setProperty('--scrollbar-width', `${window.innerWidth - root.clientWidth}px`)
    measure()
    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('resize', measure)
      root.style.removeProperty('--scrollbar-width')
    }
  }, [isWide])

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
    // How full each day of the strip is (a thin bar under every date).
    if (stripFrom) {
      getScheduleLoad(slug, stripFrom, stripLength, controller.signal)
        .then((rows) =>
          setLoads(
            new Map(
              rows.map((row) => [row.date, row.capacity > 0 ? row.minutes / row.capacity : 0]),
            ),
          ),
        )
        .catch(() => undefined)
    }

    return () => controller.abort()
  }, [slug, schedule, stripFrom, stripLength])

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

  // «Записать снова» on a cancelled visit: the same client, service, master and time.
  const handleBookCancelledAgain = (booking: AdminBooking) => {
    setSelected(null)
    setDraft({
      specialistId: booking.specialistId,
      time: booking.time,
      initial: {
        serviceId: booking.serviceId,
        name: booking.customerName,
        phone: booking.customerPhone,
      },
    })
  }

  // «Записать снова» from the client's card: their usual service, its first master, this day.
  const handleBookAgain = (client: { name: string; phone: string; serviceName: string | null }) => {
    const service = catalog.services.find((item) => item.name === client.serviceName) ?? null
    const masterId =
      catalog.specialists.find((master) => service && master.serviceIds.includes(service.id))?.id ??
      schedule?.specialists[0]?.id ??
      ''
    setClientPhone(null)
    setDraft({
      specialistId: masterId,
      time: null,
      initial: { serviceId: service?.id ?? null, name: client.name, phone: client.phone },
    })
  }

  const handleRemoveFromWaitlist = async (entry: ManagedWaitlistEntry) => {
    try {
      await removeManagedWaitlist(slug, entry.id)
      setWaitlist((current) => current.filter((item) => item.id !== entry.id))
      toast.show({
        title: t('{name} больше не ждёт', { name: entry.customerName }),
        type: 'success',
      })
    } catch (removeError) {
      toast.show({
        title: t('Не получилось'),
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
        title: t('Отмечено: {count}', {
          count: t.count(ids.length, ['визит', 'визита', 'визитов']),
        }),
        description: t('Все пришли, оплата по прайсу наличными - поправьте, где было иначе'),
        type: 'success',
        action: {
          label: t('Вернуть'),
          onClick: () => {
            trackToastAction('staff_undo_close_day')
            void reopenVisits(slug, ids).then(reload)
          },
        },
      })
    } catch (closeError) {
      toast.show({
        title: t('Не получилось'),
        description: getErrorMessage(closeError),
        type: 'error',
      })
    }
  }

  const handleCreate = (specialistId: string, time: string | null) => {
    if (isPast) {
      toast.show({ title: t('Записать в прошедший день нельзя'), type: 'info' })
      return
    }
    setDraft({ specialistId, time })
  }

  return (
    <section className={styles.content} aria-label={t('Расписание')}>
      <SectionHeader
        title={t('Расписание')}
        description={
          <>
            {schedule ? summary : <span className={styles.dayTitle}>{dayTitle}</span>}
            {/* The waiting list is a state of the day: part of the hint, not another button. */}
            {!isPast && dayWaitlist.length > 0 && (
              <button
                type='button'
                className={styles.statusLink}
                onClick={() => setIsWaitlistOpen(true)}
              >
                <BellRinging aria-hidden />
                {t('Ждут окна: {count}', { count: dayWaitlist.length })} ›
              </button>
            )}
          </>
        }
        actions={
          hasMasters && (
            <div className={styles.toolbar} data-wide ref={setToolbar}>
              <SegmentedControl
                label={t('Вид расписания')}
                size='sm'
                value={layout}
                items={LAYOUTS.map((item) => ({ ...item, label: t(item.label) }))}
                onChange={setLayout}
              />
              {!isPast && (
                <>
                  {/* Secondary tools as one capsule of thin glyphs (named in tooltips). */}
                  <GlyphGroup label={t('Инструменты дня')}>
                    <span className={styles.wideToggle}>
                      <GlyphButton
                        icon={
                          isWide ? (
                            <ArrowsInLineHorizontal aria-hidden />
                          ) : (
                            <ArrowsOutLineHorizontal aria-hidden />
                          )
                        }
                        label={isWide ? t('Обычный вид') : t('На всю ширину')}
                        aria-pressed={isWide}
                        onClick={() => setWide(!isWide)}
                      />
                    </span>
                    <GlyphButton
                      icon={<Coffee aria-hidden />}
                      label={t('Перерыв')}
                      onClick={() => setIsClosingTime(true)}
                    />
                    <GlyphButton
                      icon={<ShareNetwork aria-hidden />}
                      label={t('Поделиться свободными окнами')}
                      onClick={() => setIsSharing(true)}
                      disabled={!schedule}
                    />
                    {canSell && (
                      <GlyphButton
                        icon={<ShoppingBag aria-hidden />}
                        label={t('Продать товар')}
                        onClick={() => setSale({ booking: null })}
                      />
                    )}
                    <Menu
                      label={t('Найти место под услугу')}
                      trigger={<MagnifyingGlass aria-hidden />}
                    >
                      {catalog.services
                        .filter((service) => service.isActive !== false)
                        .map((service) => (
                          <MenuItem
                            key={service.id}
                            onClick={() => setFitServiceId(service.id)}
                            icon={
                              <span className={styles.menuMeta}>
                                {t.duration(service.durationMinutes)}
                              </span>
                            }
                          >
                            {service.name}
                          </MenuItem>
                        ))}
                    </Menu>
                  </GlyphGroup>
                  <Button
                    size='sm'
                    className={styles.iconOnPhone}
                    onClick={() =>
                      setDraft({ specialistId: schedule?.specialists[0]?.id ?? '', time: null })
                    }
                  >
                    <Plus aria-hidden />
                    <span className={styles.buttonLabel}>{t('Новая запись')}</span>
                  </Button>
                </>
              )}
            </div>
          )
        }
      />

      {error && (
        <div className={styles.error} role='alert'>
          <p>{error}</p>
          <Button variant='link' size='sm' onClick={reload}>
            {t('Повторить')}
          </Button>
        </div>
      )}

      {fitService && !isPast && (
        // While the gaps for a service are lit, one capsule names it and turns the search off.
        <div className={styles.fitBar}>
          <span className={styles.fitText}>
            {t('Места для «{service}»', { service: fitService.name })} ·{' '}
            {t.duration(fitService.durationMinutes)}
          </span>
          <Button variant='outline' size='sm' onClick={() => setFitServiceId(null)}>
            <X aria-hidden />
            {t('Готово')}
          </Button>
        </div>
      )}

      <div className={styles.panel} data-wide={isWide || undefined} data-schedule-board>
        <DayStrip
          variant='compact'
          days={days}
          value={date}
          onChange={setSelectedDay}
          marks={marks}
          loads={loads}
        />
        {/* One slim row of what needs eyes now: the visit under way, the next one, and the
            visits left unmarked (the one thing asking for action, in orange). */}
        <div className={styles.dayStatus}>
          {schedule && hasMasters && today && date === today.dayKey && (
            <NowBar bookings={schedule.bookings} nowMinutes={today.minutes} onOpen={setSelected} />
          )}
          {hasMasters && !isCloseBarHidden && (
            <CloseDayBar
              openHere={openHere}
              openElsewhere={unclosed.total - openHere}
              visitsHere={unmarkedHere}
              onOpen={(booking) => {
                setFocusedBookingId(null)
                requestAnimationFrame(() => setFocusedBookingId(booking.id))
              }}
              onCloseDay={handleCloseDay}
              onShowOther={() => setSelectedDay((firstUnclosed ?? unclosed.days[0])?.date ?? null)}
              onDismiss={() => setIsCloseBarHidden(true)}
            />
          )}
        </div>
        {!schedule && !error && <Skeleton className={styles.skeleton} />}

        {schedule && !hasMasters && (
          <EmptyState
            title={t('Добавьте мастеров')}
            text={t(
              'Откройте раздел «Мастера» и добавьте хотя бы себя - здесь появится расписание.',
            )}
          />
        )}

        {schedule && hasMasters && (
          <DayCalendar
            footCover={barSpace}
            specialists={schedule.specialists}
            bookings={schedule.bookings}
            timeOff={schedule.timeOff}
            hours={dayHours}
            nowMinutes={today && date === today.dayKey ? today.minutes : null}
            isPast={isPast}
            slotMinutes={business.slotMinutes}
            layout={layout}
            zoom={zoom}
            onZoomChange={setZoom}
            focusedBookingId={focusedBookingId}
            onMarkArrived={
              today && date && date <= today.dayKey
                ? (booking) => void markOutcome(booking.id, { outcome: 'arrived' })
                : undefined
            }
            onSelectBooking={setSelected}
            onRemoveTimeOff={removeTimeOff}
            onCreateBooking={handleCreate}
            onMoveBooking={moveBooking}
            dayKey={schedule.date}
            fit={isPast ? null : fit}
            onMarkNoShow={
              today && date && date <= today.dayKey
                ? (booking) => void markOutcome(booking.id, { outcome: 'no_show' })
                : undefined
            }
            onCancelBooking={(booking) => void cancelBooking(booking.id)}
            onSwipeDay={(step) => {
              const index = days.findIndex((day) => day.key === date)
              const next = days[index + step]
              if (next) setSelectedDay(next.key)
            }}
          />
        )}
      </div>

      {selected &&
        // With a mouse the visit opens as an inspector beside its card; on touch screens (or when
        // the card is not on the board) as a compact sheet.
        (isFinePointer && selectedCard ? (
          <Popover
            open
            onOpenChange={(open) => {
              if (!open) setSelected(null)
            }}
            anchor={selectedCard}
            label={t('Запись: {name}, {time}', {
              name: selected.customerName,
              time: selected.time,
            })}
          >
            <BookingInspector
              key={selected.id}
              slug={slug}
              booking={selected}
              onClose={() => setSelected(null)}
              onCancel={cancelBooking}
              onOutcome={today && date && date <= today.dayKey ? markOutcome : undefined}
              onOpenClient={(phone) => {
                setSelected(null)
                setClientPhone(phone)
              }}
              onBookAgain={isPast ? undefined : handleBookCancelledAgain}
              onSellProducts={
                canSell
                  ? (booking) => {
                      setSelected(null)
                      setSale({ booking })
                    }
                  : undefined
              }
            />
          </Popover>
        ) : (
          <BookingDetailsDialog
            slug={slug}
            key={selected.id}
            booking={selected}
            onClose={() => setSelected(null)}
            onCancel={cancelBooking}
            onOutcome={today && date && date <= today.dayKey ? markOutcome : undefined}
            onOpenClient={(phone) => {
              setSelected(null)
              setClientPhone(phone)
            }}
            onBookAgain={isPast ? undefined : handleBookCancelledAgain}
            onSellProducts={
              canSell
                ? (booking) => {
                    setSelected(null)
                    setSale({ booking })
                  }
                : undefined
            }
          />
        ))}

      {clientPhone && (
        <ClientSheet
          slug={slug}
          phone={clientPhone}
          onClose={() => setClientPhone(null)}
          onBook={isPast ? undefined : handleBookAgain}
        />
      )}

      {sale && (
        <SaleSheet
          slug={slug}
          specialists={catalog.specialists}
          branches={business.branches.filter((branch) => branch.isActive !== false)}
          booking={sale.booking}
          method={
            sale.booking?.paymentMethod === 'card' || sale.booking?.paymentMethod === 'transfer'
              ? sale.booking.paymentMethod
              : 'cash'
          }
          onClose={() => setSale(null)}
        />
      )}

      {draft && schedule && date && (
        <NewBookingDialog
          slug={slug}
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

      {isSharing && schedule && (
        <ShareWindowsSheet
          slug={slug}
          schedule={schedule}
          catalog={catalog}
          dayHours={dayHours}
          dayLabel={t.language === 'ru' ? dayTitle.toLowerCase() : dayTitle}
          nowMinutes={today && date === today.dayKey ? today.minutes : null}
          slotMinutes={business.slotMinutes}
          onClose={() => setIsSharing(false)}
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
