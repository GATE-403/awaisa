import { StandardSchemaValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { AppModule } from './app.module.js'
import type { Env } from './config/env.js'
import { loadRootEnv } from './runtime/load-env.js'
import { createLogger } from './runtime/logger.js'
import { parseProcessRole, servesHttp } from './runtime/process-role.js'
import { requestLog } from './runtime/request-log.js'
import { initSentry } from './runtime/sentry.js'

// HTTP server: PROCESS_ROLE `all` (default — also runs the jobs) or `api` (HTTP only).
const bootstrap = async () => {
  loadRootEnv()
  const role = parseProcessRole(process.env.PROCESS_ROLE)
  if (!servesHttp(role)) throw new Error('PROCESS_ROLE=worker starts with dist/worker.js')
  initSentry(role)

  const app = await NestFactory.create<NestExpressApplication>(AppModule.forRole(role), {
    logger: createLogger(),
  })
  const config = app.get<ConfigService<Env, true>>(ConfigService)

  app.set('trust proxy', 'loopback, linklocal, uniquelocal')
  app.use(requestLog)
  app.use(helmet())
  app.use(cookieParser())
  // Imports from other booking systems send a few thousand rows at once.
  app.useBodyParser('json', { limit: '2mb' })
  app.enableCors({ origin: config.get('WEB_ORIGIN', { infer: true }), credentials: true })
  app.useGlobalPipes(new StandardSchemaValidationPipe({ transform: true }))
  app.enableShutdownHooks()

  // A load balancer keeps idle connections open for up to 60 s; Node closing them first
  // (default 5 s) turns some requests into 502s.
  const server = app.getHttpServer()
  server.keepAliveTimeout = 65_000
  server.headersTimeout = 66_000

  await app.listen(config.get('API_PORT', { infer: true }))
}

await bootstrap()
