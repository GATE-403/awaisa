import type { ModerationAction, ReportTargetType } from '@/shared/api/types'

const TARGET_LABELS: Record<ReportTargetType, string> = {
  photo: 'Фото работы',
  review: 'Отзыв',
  profile: 'Профиль',
}

// What the journal says was done (and the toast after a decision).
const ACTION_LABELS: Record<ModerationAction, string> = {
  keep: 'Оставлено',
  hide: 'Скрыто',
  delete: 'Удалено',
  block: 'Автор заблокирован',
}

export { ACTION_LABELS, TARGET_LABELS }
