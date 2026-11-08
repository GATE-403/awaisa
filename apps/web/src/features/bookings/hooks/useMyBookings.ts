import { useToast } from '@awaisa/ui/Toast'
import { useEffect, useState } from 'react'
import { ApiError, getErrorMessage } from '@/common/api/apiError'
import { cancelBooking, getBooking } from '@/common/api/clientApi'
import { useStoredBookings } from '@/common/hooks/useStoredBookings'
import {
  forgetBooking,
  parseBookings,
  readRaw,
  updateSnapshot,
} from '@/common/utils/bookingStorage'

const NOT_FOUND_STATUS = 404

export const useMyBookings = () => {
  const { bookings, isReady } = useStoredBookings()
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const toast = useToast()
  const idsKey = bookings.map((booking) => booking.id).join(',')

  useEffect(() => {
    if (!idsKey) return

    const controller = new AbortController()

    for (const { id, token } of parseBookings(readRaw())) {
      getBooking(id, token, controller.signal)
        .then(updateSnapshot)
        .catch((requestError: unknown) => {
          if (requestError instanceof ApiError && requestError.status === NOT_FOUND_STATUS) {
            forgetBooking(id)
          }
        })
    }

    return () => controller.abort()
  }, [idsKey])

  const cancel = async (id: string) => {
    const booking = bookings.find((item) => item.id === id)
    if (!booking) return

    setCancellingId(id)

    try {
      updateSnapshot(await cancelBooking(id, booking.token))
      toast.show({
        title: 'Запись отменена',
        description: 'Будем рады видеть вас снова',
        type: 'success',
      })
    } catch (cancelError) {
      toast.show({
        title: 'Не удалось отменить',
        description: getErrorMessage(cancelError),
        type: 'error',
      })
    } finally {
      setCancellingId(null)
    }
  }

  const forget = (id: string) => {
    forgetBooking(id)
    toast.show({ title: 'Убрано из списка' })
  }

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      toast.show({ title: 'Номер скопирован', description: code, type: 'success' })
    } catch {
      toast.show({ title: 'Не удалось скопировать', type: 'error' })
    }
  }

  return {
    bookings: bookings.map((booking) => booking.snapshot),
    isReady,
    cancellingId,
    cancel,
    forget,
    copyCode,
  }
}
