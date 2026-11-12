import { StandardSchemaValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { AppModule } from './app.module.js'
import type { Env } from './config/env.js'

const bootstrap = async () => {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  const config = app.get<ConfigService<Env, true>>(ConfigService)

  app.set('trust proxy', 'loopback, linklocal, uniquelocal')
  app.use(helmet())
  app.use(cookieParser())
  // Imports from other booking systems send a few thousand rows at once.
  app.useBodyParser('json', { limit: '2mb' })
  app.enableCors({ origin: config.get('WEB_ORIGIN', { infer: true }), credentials: true })
  app.useGlobalPipes(new StandardSchemaValidationPipe({ transform: true }))
  app.enableShutdownHooks()

  await app.listen(config.get('API_PORT', { infer: true }))
}

await bootstrap()
