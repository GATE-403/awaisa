// Where a booking was opened over (the catalogue, Looks, a profile…), kept for this tab, so a
// reload of /<slug>/book can put the sheet back over that page instead of the place's own one.
const STORAGE_KEY = 'awaisa:booking-origin:v1'

type BookingOrigin = {
  slug: string
  /** Path and query of the page under the sheet. */
  from: string
}

const isBookingOrigin = (value: unknown): value is BookingOrigin =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as BookingOrigin).slug === 'string' &&
  typeof (value as BookingOrigin).from === 'string'

const readBookingOrigin = (): BookingOrigin | null => {
  try {
    const value: unknown = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? 'null')
    return isBookingOrigin(value) ? value : null
  } catch {
    return null
  }
}

const saveBookingOrigin = (origin: BookingOrigin) => {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(origin))
  } catch {
    // Private mode or storage off: a reload then shows the place under the sheet, as before.
  }
}

const clearBookingOrigin = () => {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing kept, nothing to clear.
  }
}

// Only a reload of the booking opened over another page goes back to that page: a link from an
// SMS or a QR code opens the place under the sheet, as it should.
const shouldReturnToOrigin = (
  origin: BookingOrigin | null,
  slug: string | null,
  isReload: boolean,
): origin is BookingOrigin =>
  isReload &&
  origin !== null &&
  origin.slug === slug &&
  origin.from.split('?')[0] !== `/${slug}` &&
  origin.from.startsWith('/')

// Set on <html> while a reload goes back to the page under the booking: the place's page the full
// route draws under the sheet stays hidden, so it does not flash before the catalog comes back.
// Its value says where to: “catalog” (then the catalog's skeleton stands in for it) or “page”.
const RETURNING_ATTRIBUTE = 'data-booking-returning'

// Runs while the browser parses the route's HTML, before the place's page streams in: scripts and
// the effect that steps back come too late to keep it off the screen. The same test as
// `shouldReturnToOrigin`, in plain JS.
const RETURNING_BOOT_SCRIPT = `try{var o=JSON.parse(sessionStorage.getItem('${STORAGE_KEY}')||'null'),n=performance.getEntriesByType('navigation')[0],s=location.pathname.split('/')[1];if(o&&n&&n.type==='reload'&&o.slug===s&&o.from.charAt(0)==='/'&&o.from.split('?')[0]!=='/'+s&&history.length>1)document.documentElement.setAttribute('${RETURNING_ATTRIBUTE}',o.from.split('?')[0]==='/'?'catalog':'page')}catch(e){}`

const stopReturning = () => document.documentElement.removeAttribute(RETURNING_ATTRIBUTE)

export type { BookingOrigin }
export {
  clearBookingOrigin,
  RETURNING_BOOT_SCRIPT,
  readBookingOrigin,
  saveBookingOrigin,
  shouldReturnToOrigin,
  stopReturning,
}
