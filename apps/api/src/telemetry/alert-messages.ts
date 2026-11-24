import { escapeHtml } from '../telegram/telegram-messages.js'

type ErrorGroup = { source: string; message: string; count: number }

const LISTED = 5
const MESSAGE_PREVIEW = 160

const SOURCE_LABEL: Record<string, string> = { api: 'API', web: 'Website' }

/** 'Errors in 5 min' for the platform's alert chat: the worst groups first, the rest counted. */
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
  const more = groups.length > LISTED ? `\n…and ${groups.length - LISTED} more kinds` : ''

  return `🔴 <b>Errors in ${minutes} min: ${total}</b>\n${lines.join('\n')}${more}\n\nAll: GET /telemetry/errors`
}

const redisAlertText = (reason: string) =>
  `🟠 <b>Redis unavailable</b>\n${escapeHtml(reason)}\nCache and rate limits run in each process's memory.`

export type { ErrorGroup }
export { errorsAlertText, redisAlertText }
