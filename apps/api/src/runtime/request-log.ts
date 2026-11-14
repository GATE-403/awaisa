import { randomUUID } from 'node:crypto'
import { Logger } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'

const logger = new Logger('Http')
const SLOW_MS = 1000

/**
 * Every request as one line: method, path, status, time and a request id that is also sent back
 * as `x-request-id`, so a client report can be matched to the log. The query string is left out:
 * it may carry phones and booking codes.
 */
const requestLog = (request: Request, response: Response, next: NextFunction) => {
  const path = request.originalUrl.split('?')[0] ?? ''
  if (path === '/health') return next()
  const startedAt = process.hrtime.bigint()
  const incoming = request.header('x-request-id')
  const id = incoming && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID()
  response.setHeader('x-request-id', id)
  response.on('finish', () => {
    const ms = Math.round(Number(process.hrtime.bigint() - startedAt) / 1e6)
    const line = `${request.method} ${path} ${response.statusCode} ${ms}ms id=${id}`
    if (response.statusCode >= 500) logger.error(line)
    else if (ms >= SLOW_MS) logger.warn(`${line} slow`)
    else logger.log(line)
  })
  next()
}

export { requestLog }
