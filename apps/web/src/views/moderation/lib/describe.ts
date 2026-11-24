import { msg, plural } from '@lingui/core/macro'
import { REASON_LABELS } from '@/features/report'
import type { ModerationItem } from '@/shared/api/types'
import type { Translate } from '@/shared/i18n'
import { TARGET_LABELS } from '../config/labels'

const countReports = (count: number, t: Translate) =>
  t(msg`${plural(count, { one: '# report', other: '# reports' })}`)

/** "Work photo · Old School Barbershop · 3 reports". */
const describeItem = (
  item: Pick<ModerationItem, 'targetType' | 'reports' | 'preview'>,
  t: Translate,
) =>
  [t(TARGET_LABELS[item.targetType]), item.preview?.business?.name, countReports(item.reports, t)]
    .filter(Boolean)
    .join(' · ')

/** "Spam or advertising 2 · Insults 1": the most given reason first. */
const describeReasons = (reasons: ModerationItem['reasons'], t: Translate) =>
  reasons.map((reason) => `${t(REASON_LABELS[reason.reason])} ${reason.count}`).join(' · ')

export { countReports, describeItem, describeReasons }
