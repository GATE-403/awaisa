import { escapeHtml } from '../telegram/telegram-messages.js'

type ErrorGroup = { source: string; message: string; count: number }

const LISTED = 5
const MESSAGE_PREVIEW = 160

const SOURCE_LABEL: Record<string, string> = { api: 'API', web: 'Сайт' }

/** «Ошибки за 5 мин» for the platform's alert chat: the worst groups first, the rest counted. */
const errorsAlertText = (groups: ErrorGroup[], minutes: number) => {
  const total = groups.reduce((sum, group) => sum + group.count, 0)
  const lines = groups
    .slice(0, LISTED)
    .map(
      (group) =>
        `• <b>${group.count}×</b> ${SOURCE_LABEL[group.source] ?? group.source}: ${escapeHtml(
          group.message.slice(0, MESSAGE_PREVIEW),
        )}`,
    )
  const more = groups.length > LISTED ? `\n…и ещё ${groups.length - LISTED} видов` : ''

  return `🔴 <b>Ошибки за ${minutes} мин: ${total}</b>\n${lines.join('\n')}${more}\n\nВсе: GET /telemetry/errors`
}

const redisAlertText = (reason: string) =>
  `🟠 <b>Redis недоступен</b>\n${escapeHtml(reason)}\nКэш и лимиты работают в памяти каждого процесса.`

export type { ErrorGroup }
export { errorsAlertText, redisAlertText }
