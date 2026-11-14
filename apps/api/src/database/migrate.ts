import { Logger } from '@nestjs/common'
import { createLogger } from '../runtime/logger.js'
import { dataSource } from './data-source.js'

// Production runs this once per deploy, before the api and worker processes start
// (they no longer migrate on start, because several of them start at the same time).
const migrate = async () => {
  Logger.overrideLogger(createLogger())
  const logger = new Logger('Migrations')
  await dataSource.initialize()
  try {
    const applied = await dataSource.runMigrations()
    const names = applied.map((migration) => migration.name).join(', ')
    logger.log(applied.length === 0 ? 'Up to date' : `Applied: ${names}`)
  } finally {
    await dataSource.destroy()
  }
}

await migrate()
