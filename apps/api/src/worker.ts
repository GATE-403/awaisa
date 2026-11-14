import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module.js'
import { createLogger } from './runtime/logger.js'

// The jobs process (PROCESS_ROLE=worker): cron jobs and the Telegram long-poll, no HTTP.
// Run exactly one next to any number of `api` instances.
const bootstrap = async () => {
  process.env.PROCESS_ROLE = 'worker'
  const app = await NestFactory.createApplicationContext(AppModule.forRole('worker'), {
    logger: createLogger(),
  })
  app.enableShutdownHooks()
}

await bootstrap()
