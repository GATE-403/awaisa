'use client'

import type { Booking, Review, ReviewAccess } from '@/shared/api/types'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import { RateVisitForm } from '../RateVisitForm/RateVisitForm'

interface RateVisitSheetProps {
  booking: Booking
  access: ReviewAccess
  onRated: (review: Review) => void
  onClose: () => void
}

export const RateVisitSheet = ({ booking, access, onRated, onClose }: RateVisitSheetProps) => (
  <Sheet title={booking.business.name} onClose={onClose}>
    <RateVisitForm
      bookingId={booking.id}
      access={access}
      specialistName={booking.specialistName}
      onRated={(review) => {
        onRated(review)
        onClose()
      }}
    />
  </Sheet>
)
