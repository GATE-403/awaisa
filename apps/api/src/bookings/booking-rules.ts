const BOOKING_DAYS_AHEAD = 14

const MIN_LEAD_MINUTES = 15

const ANY_SPECIALIST_ID = 'any'

const REMINDER_LEAD_MINUTES = 2 * 60

// A cancellation can be undone for this long; the salon's SMS to the client waits for it too.
const UNDO_WINDOW_SECONDS = 15

// An online booking with a deposit holds its slot this long while the client pays.
const PAYMENT_HOLD_MINUTES = 15

// A deposit comes back when the client cancels at least this long before the visit
// (or whenever the salon cancels); later cancellations keep it.
const DEPOSIT_REFUND_HOURS = 24

export {
  DEPOSIT_REFUND_HOURS,
  PAYMENT_HOLD_MINUTES,
  ANY_SPECIALIST_ID,
  BOOKING_DAYS_AHEAD,
  MIN_LEAD_MINUTES,
  REMINDER_LEAD_MINUTES,
  UNDO_WINDOW_SECONDS,
}
