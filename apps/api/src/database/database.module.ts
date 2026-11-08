import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import type { Env } from '../config/env.js'
import { getDatabaseOptions } from './database.config.js'

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        ...getDatabaseOptions(
          config.get('DATABASE_URL', { infer: true }),
          config.get('NODE_ENV', { infer: true }) === 'production',
        ),
        autoLoadEntities: true,
        migrationsRun: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
