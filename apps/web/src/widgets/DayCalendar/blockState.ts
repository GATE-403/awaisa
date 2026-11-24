import type { MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type { AdminBooking } from '@/shared/api/types'

type BlockTone = 'plain' | 'accent' | 'warning' | 'success' | 'danger' | 'muted'

type BlockLabel =
  | 'Cancelled'
  | 'Awaiting payment'
  | 'Arrived'
  | 'No-show'
  | 'Not marked'
  | 'Now'
  | 'Waiting'

// The label is a key (the glyph is picked by it); people read these words.
const BLOCK_STATE_WORDS: Record<BlockLabel, MessageDescriptor> = {
  Cancelled: msg`Cancelled`,
  'Awaiting payment': msg`Awaiting payment`,
  Arrived: msg`Arrived`,
  'No-show': msg`No-show`,
  'Not marked': msg`Not marked`,
  Now: msg`Now`,
  Waiting: msg`Waiting`,
}

// What a visit needs from the salon right now, read at a glance from the first chip. `from` and
// `to` are the visit's minutes from midnight; `nowMinutes` is null on any day but today.
const blockState = (
  booking: AdminBooking,
  from: number,
  to: number,
  nowMinutes: number | null,
  isPast: boolean,
): { tone: BlockTone; label: BlockLabel } => {
  if (booking.status === 'cancelled') return { tone: 'muted', label: 'Cancelled' }
  if (booking.payment?.status === 'pending') return { tone: 'muted', label: 'Awaiting payment' }
  if (booking.outcome === 'arrived') return { tone: 'success', label: 'Arrived' }
  if (booking.outcome === 'no_show') return { tone: 'danger', label: 'No-show' }
  if (isPast || (nowMinutes !== null && to <= nowMinutes)) {
    return { tone: 'warning', label: 'Not marked' }
  }
  if (nowMinutes !== null && from <= nowMinutes) return { tone: 'accent', label: 'Now' }

  return { tone: 'plain', label: 'Waiting' }
}

export type { BlockLabel, BlockTone }
export { BLOCK_STATE_WORDS, blockState }
