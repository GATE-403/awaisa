import { createHash } from 'node:crypto'
import type { FiscalDocument } from './receipt.js'

type IssueRequest = {
  receiptId: string
  kind: 'sale' | 'refund'
  /** A refund names the original receipt as the tax office numbered it. */
  original: { fiscalNumber: string; fiscalSign: string | null } | null
  inn: string | null
  document: FiscalDocument
  credentials: { login: string; password: string } | null
}

type IssueResult = { fiscalNumber: string; fiscalSign: string; providerUrl: string | null }

type FiscalDriver = { readonly name: string; issue(request: IssueRequest): Promise<IssueResult> }

/** The provider refused or could not be reached; the queue tries again later. */
class FiscalSendError extends Error {}

/**
 * Development and e2e: nothing leaves the server. The receipt is numbered from its id (the same
 * number however often it is retried) and written to the log, and our own page shows it.
 */
const createLogDriver = (log: (message: string) => void): FiscalDriver => ({
  name: 'log',
  issue: async (request) => {
    const fiscalNumber = `T-${request.receiptId.replaceAll('-', '').slice(0, 10).toUpperCase()}`
    const fiscalSign = String(
      Number.parseInt(createHash('sha256').update(request.receiptId).digest('hex').slice(0, 8), 16),
    ).padStart(10, '0')
    log(
      `[not sent, log driver] ${request.kind} receipt ${fiscalNumber}: ${request.document.total} сом ` +
        `(${request.document.payment}), ${request.document.lines.length} lines` +
        (request.original ? `, refund of ${request.original.fiscalNumber}` : ''),
    )
    return { fiscalNumber, fiscalSign, providerUrl: null }
  },
})

/**
 * eKassa (Telemedia Group): each business has its own cloud register on its own ИНН and signs
 * in with its login and password. eKassa gives its REST API description only on request, so the
 * calls are not written yet: every receipt waits in the queue with this error until they are,
 * and nothing is lost.
 */
const createEkassaDriver = (apiUrl: string): FiscalDriver => ({
  name: 'ekassa',
  issue: async (request) => {
    if (!request.credentials) throw new FiscalSendError('Укажите логин и пароль eKassa')
    if (!request.inn) throw new FiscalSendError('Укажите ИНН')
    throw new FiscalSendError(
      `Отправка в eKassa (${apiUrl}) ещё не подключена: ждём описание их API`,
    )
  },
})

export type { FiscalDriver, IssueRequest, IssueResult }
export { createEkassaDriver, createLogDriver, FiscalSendError }
