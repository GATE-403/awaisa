import { Logger } from '@nestjs/common'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DatabaseLogger } from './database.logger.js'

const pgError = (code: string, message: string) => Object.assign(new Error(message), { code })

describe('DatabaseLogger', () => {
  afterEach(() => vi.restoreAllMocks())

  it('keeps a booking refused for a taken time out of the error log', () => {
    const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
    const logger = new DatabaseLogger()

    logger.logQueryError(
      pgError('23P01', 'violates exclusion constraint'),
      'INSERT INTO "bookings"',
    )
    logger.logQueryError(pgError('40P01', 'deadlock detected'), 'INSERT INTO "bookings"')
    expect(error).not.toHaveBeenCalled()

    logger.logQueryError(pgError('42P01', 'relation "nope" does not exist'), 'SELECT 1 FROM nope')
    expect(error).toHaveBeenCalledOnce()
  })
})
