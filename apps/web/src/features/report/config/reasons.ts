import type { ReportReason } from '@/shared/api/types'

// The reasons a viewer picks from, in the order they are offered.
const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam or advertising' },
  { value: 'offensive', label: 'Insults' },
  { value: 'fake', label: 'Scam or fake' },
  { value: 'explicit', label: 'Explicit content' },
  { value: 'other', label: 'Other' },
]

const REASON_LABELS = Object.fromEntries(
  REPORT_REASONS.map((reason) => [reason.value, reason.label]),
) as Record<ReportReason, string>

export { REASON_LABELS, REPORT_REASONS }
