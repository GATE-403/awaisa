import { msg } from '@lingui/core/macro'

// Descriptors: show them with `t(ROW_NOTES.business)`.
const ROW_NOTES = {
  business: msg`Bookings in iPhone or Google Calendar: they update themselves, no need to open the dashboard.`,
  master: msg`Your bookings in iPhone or Google Calendar: they update themselves, no need to open “My day”.`,
}

const HIDDEN_PHONE_NOTE = msg`Without this the calendar shows only the last digits: +996 ••• ••• 456.`

export { HIDDEN_PHONE_NOTE, ROW_NOTES }
