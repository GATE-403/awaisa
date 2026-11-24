import type { ModerationAction, ReportTargetType } from '@/shared/api/types'

const TARGET_LABELS: Record<ReportTargetType, string> = {
  photo: 'Work photo',
  review: 'Review',
  profile: 'Profile',
}

// What the journal says was done (and the toast after a decision).
const ACTION_LABELS: Record<ModerationAction, string> = {
  keep: 'Kept',
  hide: 'Hidden',
  delete: 'Deleted',
  block: 'Author blocked',
}

export { ACTION_LABELS, TARGET_LABELS }
