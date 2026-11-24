import type { Booking } from '@/shared/api/types'
import { isArray, parseJson, readText, writeJson } from '@/shared/lib/storage'

type StoredBooking = {
  id: string
  token: string
  snapshot: Booking
}

const STORAGE_KEY = 'awaisa:bookings:v2'
const CHANGE_EVENT = 'awaisa:bookings-change'

const readRaw = () => readText(STORAGE_KEY)

// Bookings saved before the platform went multi-business all belong to Awaisa Studio.
const LEGACY_BUSINESS: Booking['business'] = {
  slug: 'awaisa-studio',
  name: 'Awaisa Studio',
  address: 'ул. Токтогула, 125',
  phone: '',
  mapUrl: '',
}

const withBusiness = (booking: StoredBooking): StoredBooking =>
  booking.snapshot.business
    ? booking
    : { ...booking, snapshot: { ...booking.snapshot, business: LEGACY_BUSINESS } }

const isStoredBooking = (value: unknown): value is StoredBooking =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  'token' in value &&
  'snapshot' in value &&
  typeof value.id === 'string' &&
  typeof value.token === 'string'

const parseBookings = (raw: string | null): StoredBooking[] => {
  const value = parseJson(raw, isArray) ?? []
  try {
    return value.filter(isStoredBooking).map(withBusiness)
  } catch {
    // A snapshot of a shape no version wrote: start empty.
    return []
  }
}

const writeBookings = (bookings: StoredBooking[]) => {
  if (!writeJson(STORAGE_KEY, bookings)) return
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
