import { Logger } from '@nestjs/common'
import type { Logger as TypeOrmLogger } from 'typeorm'

const SQL_PREVIEW = 1000

const preview = (query: string) => query.replace(/\s+/g, ' ').slice(0, SQL_PREVIEW)

// TypeORM's own messages through the Nest logger, so they come out as JSON in production with
// the rest. Ordinary queries are not logged; failed and slow ones are, without their parameters
// (they carry phones and names).
export class DatabaseLogger implements TypeOrmLogger {
  private readonly logger = new Logger('Database')

  logQuery() {}

  logQueryError(error: string | Error, query: string) {
    this.logger.error(`${error instanceof Error ? error.message : error} · ${preview(query)}`)
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
