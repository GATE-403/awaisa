import { isCabinetPath } from '@/shared/config/navigation'

// Where the person was before entering the business side, so the cabinet's «‹» leads back there
// (it led to the list of businesses, which sends an owner of one straight back into the cabinet).
const KEY = 'awaisa:cabinet-from:v1'

// Steps on the way in that are no place to return to: sign-in, the new business form, and
// «Что нового», which is opened from the cabinet and comes back to it.
const isPassage = (pathname: string) =>
  pathname === '/login' || pathname.startsWith('/business/new') || pathname === '/updates'

const rememberCabinetFrom = (previous: string, next: string) => {
  const previousPath = previous.split('?')[0] ?? ''
  const nextPath = next.split('?')[0] ?? ''
  if (!isCabinetPath(nextPath) || isCabinetPath(previousPath) || isPassage(previousPath)) return
  try {
    sessionStorage.setItem(KEY, previous)
  } catch {}
}

const readCabinetFrom = () => {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

const LABELS: Record<string, string> = {
  '/': 'Catalogue',
  '/bookings': 'Profile',
  '/map': 'Map',
  '/feed': 'Looks',
  '/top': 'Rating',
  '/business': 'Business',
}

/** The word on «‹» for a path to go back to. */
const getBackLabel = (path: string) => LABELS[path.split('?')[0] ?? ''] ?? 'Back'

export { getBackLabel, readCabinetFrom, rememberCabinetFrom }
