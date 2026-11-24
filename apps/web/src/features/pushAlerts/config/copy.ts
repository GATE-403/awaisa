import { msg } from '@lingui/core/macro'

// Descriptors: show them with `t(INSTALL_HINT)`.

// iPhone Safari cannot take pushes: the site has to be on the home screen first (iOS 16.4+).
const INSTALL_HINT = msg`On iPhone, notifications only come from the app: “Share” → “Add to Home Screen”, then turn them on there.`

const DENIED_HINT = msg`Notifications are blocked for this site in your browser settings: allow them there.`

// In the app the answer lives in the phone's settings, not a browser's.
const APP_DENIED_HINT = msg`Notifications for Awaisa are blocked in your phone settings: allow them there.`

const AUDIENCE_NOTES = {
  business: msg`New bookings, moves and cancellations from clients, even when the dashboard is closed.`,
  master: msg`New bookings with you, moves and cancellations, even when the page is closed.`,
}

export { APP_DENIED_HINT, AUDIENCE_NOTES, DENIED_HINT, INSTALL_HINT }
