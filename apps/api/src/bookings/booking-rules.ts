const BOOKING_DAYS_AHEAD = 14

const MIN_LEAD_MINUTES = 15

const ANY_SPECIALIST_ID = 'any'

const REMINDER_LEAD_MINUTES = 2 * 60

// A cancellation can be undone for this long; the salon's SMS to the client waits for it too.
const UNDO_WINDOW_SECONDS = 15

export {
  ANY_SPECIALIST_ID,
  BOOKING_DAYS_AHEAD,
  MIN_LEAD_MINUTES,
  REMINDER_LEAD_MINUTES,
  UNDO_WINDOW_SECONDS,
}
