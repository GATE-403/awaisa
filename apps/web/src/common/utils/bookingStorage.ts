import type { Booking } from '@/common/api/types'

type StoredBooking = {
  id: string
  token: string
  snapshot: Booking
}

const STORAGE_KEY = 'awaisa:bookings:v2'
const CHANGE_EVENT = 'awaisa:bookings-change'

const readRaw = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

const isStoredBooking = (value: unknown): value is StoredBooking =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  'token' in value &&
  'snapshot' in value &&
  typeof value.id === 'string' &&
  typeof value.token === 'string'

const parseBookings = (raw: string | null): StoredBooking[] => {
  if (!raw) return []

  try {
    const value: unknown = JSON.parse(raw)
    return Array.isArray(value) ? value.filter(isStoredBooking) : []
  } catch {
    return []
  }
}

const writeBookings = (bookings: StoredBooking[]) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings))
  } catch {
    return
  }

  window.dispatchEvent(new Event(CHANGE_EVENT))
}

const saveBooking = (booking: StoredBooking) =>
  writeBookings([booking, ...parseBookings(readRaw()).filter((item) => item.id !== booking.id)])

const updateSnapshot = (snapshot: Booking) =>
  writeBookings(
    parseBookings(readRaw()).map((item) =>
      item.id === snapshot.id ? { ...item, snapshot } : item,
    ),
  )

const forgetBooking = (id: string) =>
  writeBookings(parseBookings(readRaw()).filter((item) => item.id !== id))

const subscribeToBookings = (onChange: () => void) => {
  window.addEventListener('storage', onChange)
  window.addEventListener(CHANGE_EVENT, onChange)

  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}

export type { StoredBooking }
export { forgetBooking, parseBookings, readRaw, saveBooking, subscribeToBookings, updateSnapshot }
