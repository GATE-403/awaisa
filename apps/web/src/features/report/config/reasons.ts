import type { ReportReason } from '@/shared/api/types'

// The reasons a viewer picks from, in the order they are offered.
const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Спам или реклама' },
  { value: 'offensive', label: 'Оскорбления' },
  { value: 'fake', label: 'Обман или подделка' },
  { value: 'explicit', label: 'Откровенное содержимое' },
  { value: 'other', label: 'Другое' },
]

const REASON_LABELS = Object.fromEntries(
  REPORT_REASONS.map((reason) => [reason.value, reason.label]),
) as Record<ReportReason, string>

export { REASON_LABELS, REPORT_REASONS }
