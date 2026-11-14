import { ConsoleLogger } from '@nestjs/common'
import { reportJobFailure } from './job-failures.js'

// One JSON object per line in production, so the host's log collector can filter by level,
// context and fields; readable coloured lines in development.
class AppLogger extends ConsoleLogger {
  override error(message: unknown, ...rest: unknown[]) {
    super.error(message, ...rest)
    if (rest.at(-1) !== 'Scheduler') return
    const error = message instanceof Error ? message : new Error(String(message))
    reportJobFailure({ message: error.message, stack: error.stack ?? '' })
  }
}

const createLogger = () =>
  new AppLogger({ json: process.env.NODE_ENV === 'production', prefix: 'Awaisa' })

export { createLogger }
