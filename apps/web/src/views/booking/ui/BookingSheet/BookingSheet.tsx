'use client'

import { type ReactNode, useEffect, useRef, useState } from 'react'
import { isBookingPath } from '@/shared/config/navigation'
import { usePathname } from '@/shared/i18n/navigation'
import { useFocusedFieldInView } from '@/shared/lib/hooks/useFocusedFieldInView'
import { useInertOutside } from '@/shared/lib/hooks/useInertOutside'
import { usePageScrollLock } from '@/shared/lib/hooks/usePageScrollLock'
import pageStyles from '../../BookingPage.module.css'
import { clearSheetAlreadyUp, isSheetAlreadyUp } from '../../lib/sheetHandoff'
import { BookingScrim } from '../BookingTopBar/BookingTopBar'

interface BookingSheetProps {
  children: ReactNode
  /** Opened over another page (the `@modal` slot): closing is “back”. */
  isModal?: boolean
  /** Opened as a page of its own: where the scrim leads (the place). */
  closeHref?: string
}

// The sheet the booking lives in: the dimmed site and the panel over it. One element from the tap
// to the finished form: over a page it sits outside the slot's Suspense and only what is inside
// it changes (a placeholder, then the form). Two sheets, one in the fallback and one in the form,
// meant the first slid up, was taken away, and the second slid up again.
export const BookingSheet = ({ children, isModal = false, closeHref }: BookingSheetProps) => {
  const pathname = usePathname()
  // Over a page, the slot keeps its last page on other soft navigations: show only on our address.
  if (isModal && !isBookingPath(pathname)) return null

  return (
    <SheetFrame isModal={isModal} closeHref={closeHref}>
      {children}
    </SheetFrame>
  )
}

// The sheet's slide up (`rise` in BookingPage.module.css) and a little more.
const SHEET_SETTLE_MS = 460

const SheetFrame = ({ children, isModal = false, closeHref }: BookingSheetProps) => {
  const [isAlreadyUp] = useState(isSheetAlreadyUp)
  // Locking the page and making it inert restyle and lay out all of it: done once the sheet has
  // slid up, not during the slide (it dropped to 43 fps on a Samsung A55 on a long place page).
  const settleMs = isAlreadyUp ? 0 : SHEET_SETTLE_MS
  usePageScrollLock(settleMs)
  const screenRef = useRef<HTMLElement>(null)
  useInertOutside(screenRef, undefined, settleMs)
  useFocusedFieldInView(screenRef)
  useEffect(clearSheetAlreadyUp, [])

  return (
    <>
      <BookingScrim href={closeHref} isModal={isModal} isAlreadyUp={isAlreadyUp} />
      <main
        ref={screenRef}
        className={pageStyles.page}
        data-booking-screen=''
        data-sheet-drag=''
        data-already-up={isAlreadyUp || undefined}
      >
        {children}
      </main>
    </>
  )
}
