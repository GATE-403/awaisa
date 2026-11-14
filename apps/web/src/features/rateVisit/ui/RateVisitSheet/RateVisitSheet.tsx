'use client'

import type { Booking, Review, ReviewAccess } from '@/shared/api/types'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import { RateVisitForm } from '../RateVisitForm/RateVisitForm'

interface RateVisitSheetProps {
  booking: Booking
  access: ReviewAccess
  initialRating?: number
  onRated: (review: Review) => void
  onClose: () => void
}

export const RateVisitSheet = ({
  booking,
  access,
  initialRating,
  onRated,
  onClose,
}: RateVisitSheetProps) => (
  <Sheet title={booking.business.name} onClose={onClose}>
    <RateVisitForm
      bookingId={booking.id}
      access={access}
      specialistName={booking.specialistName}
      initialRating={initialRating}
      rebookHref={`/${booking.business.slug}/book?service=${booking.serviceId}`}
      specialistId={booking.specialistId}
      onRated={(review) => {
        onRated(review)
        onClose()
      }}
    />
  </Sheet>
)
