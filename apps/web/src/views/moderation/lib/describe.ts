import { REASON_LABELS } from '@/features/report'
import type { ModerationItem } from '@/shared/api/types'
import type { Translate } from '@/shared/i18n'
import { pluralize } from '@/shared/lib/plural'
import { TARGET_LABELS } from '../config/labels'

const REPORTS: [string, string] = ['report', 'reports']

// Without a translator (tests, Russian) the words stay as they are.
const word = (text: string, t?: Translate) => (t ? t(text) : text)

const countReports = (count: number, t?: Translate) =>
  t ? t.count(count, REPORTS) : pluralize(count, REPORTS)

/** «Фото работы · Барбершоп Old School · 3 жалобы». */
const describeItem = (
  item: Pick<ModerationItem, 'targetType' | 'reports' | 'preview'>,
  t?: Translate,
) =>
  [
    word(TARGET_LABELS[item.targetType], t),
    item.preview?.business?.name,
    countReports(item.reports, t),
  ]
    .filter(Boolean)
    .join(' · ')

/** «Спам или реклама 2 · Оскорбления 1»: the most given reason first. */
const describeReasons = (reasons: ModerationItem['reasons'], t?: Translate) =>
  reasons.map((reason) => `${word(REASON_LABELS[reason.reason], t)} ${reason.count}`).join(' · ')

export { countReports, describeItem, describeReasons }
