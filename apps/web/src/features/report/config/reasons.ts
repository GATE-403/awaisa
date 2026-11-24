import type { MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type { ReportReason } from '@/shared/api/types'

// The reasons a viewer picks from, in the order they are offered.
const REPORT_REASONS: { value: ReportReason; label: MessageDescriptor }[] = [
  { value: 'spam', label: msg`Spam or advertising` },
  { value: 'offensive', label: msg`Insults` },
  { value: 'fake', label: msg`Scam or fake` },
  { value: 'explicit', label: msg`Explicit content` },
  { value: 'other', label: msg`Other` },
]

const REASON_LABELS = Object.fromEntries(
  REPORT_REASONS.map((reason) => [reason.value, reason.label]),
) as Record<ReportReason, MessageDescriptor>

export { REASON_LABELS, REPORT_REASONS }
