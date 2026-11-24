import type { ModerationAction, ReportTargetType } from '@awaisa/contracts'

/** Different reporters that take a thing out of sight until a moderator looks. */
const REPORTS_TO_HIDE = 3

type AutoHideInput = {
  /** Open reports from different devices or accounts. */
  reporters: number
  isHidden: boolean
  /** A moderator already chose 'Keep': reports keep coming to the queue, nothing hides. */
  isKept: boolean
}

/** Whether this report hides the thing now (it was visible and crossed the line). */
const shouldAutoHide = ({ reporters, isHidden, isKept }: AutoHideInput) =>
  !isHidden && !isKept && reporters >= REPORTS_TO_HIDE

/** Who reported: the account when signed in (one person on several devices counts once). */
const reporterKey = (customerId: string | null, session: string | null) => {
  if (customerId) return `c:${customerId}`
  if (session) return `s:${session}`
  return null
}

const ACTIONS_BY_TYPE: Record<ReportTargetType, ModerationAction[]> = {
  photo: ['keep', 'hide', 'delete'],
  review: ['keep', 'hide', 'delete'],
  profile: ['keep', 'hide', 'delete', 'block'],
}

const canApply = (type: ReportTargetType, action: ModerationAction) =>
  ACTIONS_BY_TYPE[type].includes(action)

export { ACTIONS_BY_TYPE, canApply, REPORTS_TO_HIDE, reporterKey, shouldAutoHide }
