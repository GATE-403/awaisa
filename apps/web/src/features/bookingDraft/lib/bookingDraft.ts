'use client'

type BookingDraft = {
  slug: string
  businessName: string
  serviceId: string
  serviceName: string
  specialistId: string | null
  branchId: string | null
  updatedAt: number
}

const STORAGE_KEY = 'awaisa:booking-draft:v1'
const MAX_AGE_MS = 24 * 60 * 60_000
const EVENT = 'awaisa:booking-draft'

const readDraft = (): BookingDraft | null => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const draft = JSON.parse(raw) as BookingDraft
    if (!draft.slug || !draft.serviceId || Date.now() - draft.updatedAt > MAX_AGE_MS) return null

    return draft
  } catch {
    return null
  }
}

const notify = () => window.dispatchEvent(new Event(EVENT))

// A booking left half-way is kept on the device, so the client can pick it up again.
const saveDraft = (draft: Omit<BookingDraft, 'updatedAt'>) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...draft, updatedAt: Date.now() }))
    notify()
  } catch {
    // Storage may be unavailable (private mode): resuming is a convenience only.
  }
}

const clearDraft = () => {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
    notify()
  } catch {
    // Same as above.
  }
}

const draftHref = (draft: BookingDraft) => {
  const params = new URLSearchParams({ service: draft.serviceId })
  if (draft.specialistId) params.set('specialist', draft.specialistId)
  if (draft.branchId) params.set('branch', draft.branchId)

  return `/${draft.slug}/book?${params}`
}

const subscribeToDraft = (onChange: () => void) => {
  window.addEventListener(EVENT, onChange)
  window.addEventListener('storage', onChange)

  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

export type { BookingDraft }
export { clearDraft, draftHref, readDraft, saveDraft, subscribeToDraft }
