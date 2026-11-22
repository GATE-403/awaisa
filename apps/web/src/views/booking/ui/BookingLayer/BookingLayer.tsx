import type { ReactNode } from 'react'
import styles from './BookingLayer.module.css'

// Holds the booking opened over a page (the `@modal` slot). After a navigation Next scrolls the
// window to the new segment unless its top already sits below the page's `scroll-padding-top`.
// The scrim and the sheet start above that line (at 0 and 20px), so Next read the sheet as off
// screen and scrolled the catalog under it to the top. This box is the segment's one element:
// empty, fixed in the middle of the window, so Next finds it on screen and leaves the page alone;
// the scrim and the sheet inside are fixed to the window as before.
export const BookingLayer = ({ children }: { children: ReactNode }) => (
  <div className={styles.layer}>{children}</div>
)
