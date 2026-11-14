import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import type { Env } from '../config/env.js'
import { RuntimeService } from '../runtime/runtime.service.js'
import { getDatabaseOptions } from './database.config.js'
import { DatabaseLogger } from './database.logger.js'

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService, RuntimeService],
      useFactory: (config: ConfigService<Env, true>, runtime: RuntimeService) => ({
        ...getDatabaseOptions(
          config.get('DATABASE_URL', { infer: true }),
          config.get('NODE_ENV', { infer: true }) === 'production',
        ),
        autoLoadEntities: true,
        logger: new DatabaseLogger(),
        // Slower queries are logged as warnings with their SQL.
        maxQueryExecutionTime: 1_000,
        poolSize: config.get('DATABASE_POOL_SIZE', { infer: true }),
        extra: {
          // A runaway query is cancelled instead of holding a connection while others queue.
          statement_timeout: config.get('DATABASE_STATEMENT_TIMEOUT_MS', { infer: true }),
          // A transaction left open by a bug would otherwise keep its locks indefinitely.
          idle_in_transaction_session_timeout: 60_000,
          // A full pool answers with an error in 5 s instead of leaving the request hanging.
          connectionTimeoutMillis: 5_000,
          // Names the process in pg_stat_activity: awaisa-api, awaisa-worker.
          application_name: `awaisa-${runtime.role}`,
        },
        // Split processes start in parallel, so production runs `migrate` once before them.
        migrationsRun: runtime.role === 'all',
      }),
    }),
  ],
})
export class DatabaseModule {}
