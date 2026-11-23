'use client'

import { Button } from '@awaisa/ui/Button'
import { Input } from '@awaisa/ui/Input'
import { Select } from '@awaisa/ui/Select'
import { Skeleton } from '@awaisa/ui/Skeleton'
import { Switch } from '@awaisa/ui/Switch'
import { useToast } from '@awaisa/ui/Toast'
import { X } from '@phosphor-icons/react/ssr'
import { useEffect, useId, useState } from 'react'
import { findDay, formatClock, parseClock, TIME_OPTIONS, WEEKDAYS_FULL } from '@/entities/business'
import { getErrorMessage } from '@/shared/api/apiError'
import {
  addMasterLeave,
  getMasterSchedule,
  removeMasterLeave,
  setMasterHours,
} from '@/shared/api/clientApi'
import type { MasterSchedule, Specialist, WorkingDay } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { DateField } from '@/shared/ui/DateField/DateField'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import styles from './MasterScheduleSheet.module.css'

interface MasterScheduleSheetProps {
  slug: string
  master: Pick<Specialist, 'id' | 'name'>
  businessHours: WorkingDay[]
  onClose: () => void
}

type DayDraft = { isOn: boolean; from: string; to: string }

const TIME_ITEMS = TIME_OPTIONS.map((time) => ({ value: time, label: time }))
const rangeFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })

const toDrafts = (hours: WorkingDay[]): DayDraft[] =>
  WEEKDAYS_FULL.map((_, weekday) => {
    const day = findDay(hours, weekday)
    return day
      ? { isOn: true, from: formatClock(day.opensMinutes), to: formatClock(day.closesMinutes) }
      : { isOn: false, from: '10:00', to: '19:00' }
  })

const toHours = (days: DayDraft[]) =>
  days.flatMap((day, weekday) =>
    day.isOn
      ? [{ weekday, opensMinutes: parseClock(day.from), closesMinutes: parseClock(day.to) }]
      : [],
  )

const formatRange = (from: string, to: string) => {
  const start = rangeFormatter.format(new Date(`${from}T00:00:00`))
  return from === to ? start : `${start} – ${rangeFormatter.format(new Date(`${to}T00:00:00`))}`
}

// A master's week («как у салона» or their own days) and days away, in one sheet.
export const MasterScheduleSheet = ({
  slug,
  master,
  businessHours,
  onClose,
}: MasterScheduleSheetProps) => {
  const toast = useToast()
  const t = useT()
  const fromId = useId()
  const toId = useId()
  const [schedule, setSchedule] = useState<MasterSchedule | null>(null)
  const [hasOwnHours, setHasOwnHours] = useState(false)
  const [days, setDays] = useState<DayDraft[]>(() => toDrafts(businessHours))
  const [leave, setLeave] = useState({ startsOn: '', endsOn: '', reason: '' })
  const [isSaving, setIsSaving] = useState(false)

  // biome-ignore lint/correctness/useExhaustiveDependencies: business hours only seed the draft
  useEffect(() => {
    const controller = new AbortController()
    getMasterSchedule(slug, master.id, controller.signal)
      .then((loaded) => {
        setSchedule(loaded)
        setHasOwnHours(loaded.hasOwnHours)
        if (loaded.hasOwnHours) setDays(toDrafts(loaded.hours))
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          toast.show({
            title: t('Не получилось'),
            description: getErrorMessage(error),
            type: 'error',
          })
        }
      })

    return () => controller.abort()
  }, [slug, master.id])

  const invalidDay = hasOwnHours ? days.findIndex((day) => day.isOn && day.from >= day.to) : -1
  const isDirty =
    schedule !== null &&
    (hasOwnHours !== schedule.hasOwnHours ||
      (hasOwnHours && JSON.stringify(toHours(days)) !== JSON.stringify(schedule.hours)))

  const updateDay = (weekday: number, patch: Partial<DayDraft>) =>
    setDays((current) =>
      current.map((day, index) => (index === weekday ? { ...day, ...patch } : day)),
    )

  const handleDone = async () => {
    if (!isDirty) {
      onClose()
      return
    }
    if (invalidDay !== -1) return
    setIsSaving(true)
    try {
      await setMasterHours(slug, master.id, { hasOwnHours, days: hasOwnHours ? toHours(days) : [] })
      toast.show({ title: t('График {name} сохранён', { name: master.name }), type: 'success' })
      onClose()
    } catch (error) {
      toast.show({ title: t('Не получилось'), description: getErrorMessage(error), type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddLeave = async () => {
    if (!schedule || !leave.startsOn) return
    try {
      const endsOn = leave.endsOn || leave.startsOn
      const { leave: added, conflictingBookings } = await addMasterLeave(slug, master.id, {
        ...leave,
        endsOn,
      })
      setSchedule({
        ...schedule,
        leaves: [...schedule.leaves, added].sort((a, b) => a.startsOn.localeCompare(b.startsOn)),
      })
      setLeave({ startsOn: '', endsOn: '', reason: '' })
      toast.show({
        title: t('Отпуск добавлен'),
        description:
          conflictingBookings > 0
            ? t('На эти дни уже {bookings}: перенесите или отмените', {
                bookings: t.count(conflictingBookings, ['запись', 'записи', 'записей']),
              })
            : t('Новые записи на эти дни не откроются'),
        type: conflictingBookings > 0 ? 'info' : 'success',
      })
    } catch (error) {
      toast.show({ title: t('Не получилось'), description: getErrorMessage(error), type: 'error' })
    }
  }

  const handleRemoveLeave = async (id: string) => {
    if (!schedule) return
    try {
      await removeMasterLeave(slug, master.id, id)
      setSchedule({ ...schedule, leaves: schedule.leaves.filter((item) => item.id !== id) })
    } catch (error) {
      toast.show({ title: t('Не получилось'), description: getErrorMessage(error), type: 'error' })
    }
  }

  return (
    <Sheet
      title={master.name}
      onClose={onClose}
      action={{
        label: isDirty ? t('Сохранить') : t('Готово'),
        onClick: handleDone,
        disabled: isSaving,
      }}
    >
      {!schedule && <Skeleton className={styles.skeleton} />}
      {schedule && (
        <>
          <section className={sheet.group} aria-label={t('Часы работы')}>
            <SectionCaption>{t('Часы работы')}</SectionCaption>
            <div className={sheet.list}>
              <label className={sheet.row}>
                <span className={sheet.rowLabel}>{t('Как у салона')}</span>
                <Switch
                  checked={!hasOwnHours}
                  onCheckedChange={(followsBusiness) => setHasOwnHours(!followsBusiness)}
                />
              </label>
              {hasOwnHours &&
                days.map((day, weekday) => {
                  const dayName = t(WEEKDAYS_FULL[weekday] ?? '')
                  return (
                    <div key={WEEKDAYS_FULL[weekday]} className={styles.dayRow}>
                      <Switch
                        aria-label={t('{day}: работает', { day: dayName })}
                        checked={day.isOn}
                        onCheckedChange={(isOn) => updateDay(weekday, { isOn })}
                      />
                      <span className={styles.dayName}>{dayName}</span>
                      {day.isOn ? (
                        <span className={styles.range}>
                          <Select
                            aria-label={t('{day}: с', { day: dayName })}
                            items={TIME_ITEMS}
                            value={day.from}
                            onValueChange={(value) => value && updateDay(weekday, { from: value })}
                          />
                          –
                          <Select
                            aria-label={t('{day}: до', { day: dayName })}
                            items={TIME_ITEMS}
                            value={day.to}
                            onValueChange={(value) => value && updateDay(weekday, { to: value })}
                          />
                        </span>
                      ) : (
                        <span className={styles.off}>{t('Выходной')}</span>
                      )}
                    </div>
                  )
                })}
            </div>
            <p className={sheet.groupFooter}>
              {invalidDay !== -1
                ? t('{day}: конец должен быть позже начала', {
                    day: t(WEEKDAYS_FULL[invalidDay] ?? ''),
                  })
                : hasOwnHours
                  ? t('Клиенты видят время мастера только в эти часы и только пока салон открыт.')
                  : t('Мастер работает все часы салона.')}
            </p>
          </section>

          <section className={sheet.group} aria-label={t('Отпуск и выходные')}>
            <SectionCaption>{t('Отпуск и выходные')}</SectionCaption>
            <div className={sheet.list}>
              {schedule.leaves.map((item) => (
                <div key={item.id} className={styles.leave}>
                  <span className={styles.leaveText}>
                    <span className={styles.leaveDates}>
                      {formatRange(item.startsOn, item.endsOn)}
                    </span>
                    {item.reason && <span className={styles.leaveReason}>{item.reason}</span>}
                  </span>
                  <button
                    type='button'
                    className={styles.remove}
                    aria-label={t('Убрать отпуск {dates}', {
                      dates: formatRange(item.startsOn, item.endsOn),
                    })}
                    onClick={() => handleRemoveLeave(item.id)}
                  >
                    <X aria-hidden />
                  </button>
                </div>
              ))}
              <div className={styles.leaveForm}>
                <label htmlFor={fromId} className={styles.dateField}>
                  <span>{t('С')}</span>
                  <DateField
                    id={fromId}
                    label={t('Отпуск с')}
                    value={leave.startsOn}
                    onChange={(startsOn) => setLeave({ ...leave, startsOn })}
                  />
                </label>
                <label htmlFor={toId} className={styles.dateField}>
                  <span>{t('По')}</span>
                  <DateField
                    id={toId}
                    label={t('Отпуск по')}
                    value={leave.endsOn}
                    min={leave.startsOn || undefined}
                    onChange={(endsOn) => setLeave({ ...leave, endsOn })}
                  />
                </label>
                <Input
                  aria-label={t('Причина')}
                  placeholder={t('Причина — по желанию')}
                  value={leave.reason}
                  onChange={(event) => setLeave({ ...leave, reason: event.target.value })}
                  className={styles.reason}
                />
                <Button
                  variant='secondary'
                  size='sm'
                  onClick={handleAddLeave}
                  disabled={!leave.startsOn}
                  className={styles.addLeave}
                >
                  {t('Добавить отпуск')}
                </Button>
              </div>
            </div>
            <p className={sheet.groupFooter}>
              {t('В эти дни мастер не появится в записи; уже сделанные записи останутся.')}
            </p>
          </section>
        </>
      )}
    </Sheet>
  )
}
