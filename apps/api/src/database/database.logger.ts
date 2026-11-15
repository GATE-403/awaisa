import { Logger } from '@nestjs/common'
import type { Logger as TypeOrmLogger } from 'typeorm'

const SQL_PREVIEW = 1000
// Exclusion violation (an overlapping booking) and the deadlock two such bookings can hit.
const EXPECTED_CONFLICTS = new Set(['23P01', '40P01'])

const preview = (query: string) => query.replace(/\s+/g, ' ').slice(0, SQL_PREVIEW)

// TypeORM's own messages through the Nest logger, so they come out as JSON in production with
// the rest. Ordinary queries are not logged; failed and slow ones are, without their parameters
// (they carry phones and names).
export class DatabaseLogger implements TypeOrmLogger {
  private readonly logger = new Logger('Database')

  logQuery() {}

  logQueryError(error: string | Error, query: string) {
    const message = `${error instanceof Error ? error.message : error} · ${preview(query)}`
    // TypeORM hands over the pg driver's error here (code on it), or its own wrapper (driverError).
    const failure = error as { code?: string; driverError?: { code?: string } }
    const code = failure.code ?? failure.driverError?.code
    // A booking refused because the time was just taken is an ordinary 409, not an error; a rush
    // logged hundreds of these as errors. Deadlocks between two such bookings are handled the same.
    if (code && EXPECTED_CONFLICTS.has(code)) return
    this.logger.error(message)
  }

  logQuerySlow(time: number, query: string) {
    this.logger.warn(`Slow query ${time}ms · ${preview(query)}`)
  }

  logSchemaBuild() {}

  logMigration(message: string) {
    this.logger.log(message)
  }

  log(level: 'log' | 'info' | 'warn', message: unknown) {
    if (level === 'warn') this.logger.warn(String(message))
  }
}
