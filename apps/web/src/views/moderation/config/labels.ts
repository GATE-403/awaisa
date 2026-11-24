import type { MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type { ModerationAction, ReportTargetType } from '@/shared/api/types'

const TARGET_LABELS: Record<ReportTargetType, MessageDescriptor> = {
  photo: msg`Work photo`,
  review: msg`Review`,
  profile: msg`Profile`,
}

// What the journal says was done (and the toast after a decision).
const ACTION_LABELS: Record<ModerationAction, MessageDescriptor> = {
  keep: msg`Kept`,
  hide: msg`Hidden`,
  delete: msg`Deleted`,
  block: msg`Author blocked`,
}

export { ACTION_LABELS, TARGET_LABELS }
