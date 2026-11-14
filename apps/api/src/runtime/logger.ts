import { ConsoleLogger } from '@nestjs/common'

// One JSON object per line in production, so the host's log collector can filter by level,
// context and fields; readable coloured lines in development.
const createLogger = () =>
  new ConsoleLogger({ json: process.env.NODE_ENV === 'production', prefix: 'Awaisa' })

export { createLogger }
