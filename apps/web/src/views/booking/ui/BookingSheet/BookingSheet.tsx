'use client'

import { usePathname } from 'next/navigation'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { isBookingPath } from '@/shared/config/navigation'
import { useFocusedFieldInView } from '@/shared/lib/hooks/useFocusedFieldInView'
import { useInertOutside } from '@/shared/lib/hooks/useInertOutside'
import { usePageScrollLock } from '@/shared/lib/hooks/usePageScrollLock'
import pageStyles from '../../BookingPage.module.css'
import { clearSheetAlreadyUp, isSheetAlreadyUp } from '../../lib/sheetHandoff'
import { useCardFlight } from '../../model/useCardFlight'
import { useRecedePage } from '../../model/useRecedePage'
import { BookingScrim } from '../BookingTopBar/BookingTopBar'

interface BookingSheetProps {
  children: ReactNode
  /** Opened over another page (the `@modal` slot): closing is «back». */
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

const SheetFrame = ({ children, isModal = false, closeHref }: BookingSheetProps) => {
  usePageScrollLock()
  const screenRef = useRef<HTMLElement>(null)
  useInertOutside(screenRef)
  useFocusedFieldInView(screenRef)
  useCardFlight(screenRef)
  useRecedePage(screenRef)
  const [isAlreadyUp] = useState(isSheetAlreadyUp)
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
