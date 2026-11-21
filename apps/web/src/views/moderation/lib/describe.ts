import { REASON_LABELS } from '@/features/report'
import type { ModerationItem } from '@/shared/api/types'
import { pluralize } from '@/shared/lib/plural'
import { TARGET_LABELS } from '../config/labels'

/** «Фото работы · Барбершоп Old School · 3 жалобы». */
const describeItem = (item: Pick<ModerationItem, 'targetType' | 'reports' | 'preview'>) =>
  [
    TARGET_LABELS[item.targetType],
    item.preview?.business?.name,
    pluralize(item.reports, ['жалоба', 'жалобы', 'жалоб']),
  ]
    .filter(Boolean)
    .join(' · ')

/** «Спам или реклама 2 · Оскорбления 1»: the most given reason first. */
const describeReasons = (reasons: ModerationItem['reasons']) =>
  reasons.map((reason) => `${REASON_LABELS[reason.reason]} ${reason.count}`).join(' · ')

export { describeItem, describeReasons }
