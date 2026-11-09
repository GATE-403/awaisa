import { useToast } from '@awaisa/ui/Toast'
import { useCallback, useEffect, useState } from 'react'
import { getErrorMessage } from '@/common/api/apiError'
import {
  cancelBookingAsSalon,
  createStaffBooking,
  createTimeOff,
  deleteTimeOff,
  getAdminSchedule,
} from '@/common/api/clientApi'
import type { AdminSchedule, CreateBookingInput, CreateTimeOffInput } from '@/common/api/types'
import { pluralize } from '@/common/utils/plural'

export const useAdminSchedule = (slug: string, date: string | null) => {
  const toast = useToast()
  const [schedule, setSchedule] = useState<AdminSchedule | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: `version` is the reload trigger
  useEffect(() => {
    if (!date) return

    const controller = new AbortController()
    setError(null)
    getAdminSchedule(slug, date, controller.signal)
      .then(setSchedule)
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) setError(getErrorMessage(requestError))
      })

    return () => controller.abort()
  }, [slug, date, version])

  const reload = useCallback(() => setVersion((value) => value + 1), [])

  const runAction = async (action: () => Promise<string>) => {
    try {
      toast.show({ title: await action(), type: 'success' })
      reload()
      return true
    } catch (actionError) {
      toast.show({
        title: 'Не получилось',
        description: getErrorMessage(actionError),
        type: 'error',
      })
      return false
    }
  }

  const cancelBooking = (id: string) =>
    runAction(async () => {
      await cancelBookingAsSalon(slug, id)
      return 'Запись отменена, клиенту ушло SMS'
    })

  const addBooking = (input: CreateBookingInput) =>
    runAction(async () => {
      const booking = await createStaffBooking(slug, input)
      return `${booking.customerName} записан(а) на ${booking.time}, клиенту ушло SMS`
    })

  const addTimeOff = (input: CreateTimeOffInput) =>
    runAction(async () => {
      const { conflictingBookingIds } = await createTimeOff(slug, input)
      if (conflictingBookingIds.length === 0) return 'Время закрыто'

      return `Время закрыто. В нём ${pluralize(conflictingBookingIds.length, ['запись', 'записи', 'записей'])} — отмените или перенесите`
    })

  const removeTimeOff = (id: string) =>
    runAction(async () => {
      await deleteTimeOff(slug, id)
      return 'Время снова открыто'
    })

  return { schedule, error, reload, addBooking, cancelBooking, addTimeOff, removeTimeOff }
}
