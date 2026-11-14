import { Module } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'
import { AuthModule } from '../auth/auth.module.js'
import { ServerErrorsFilter } from './server-errors.filter.js'
import { TelemetryController } from './telemetry.controller.js'
import { TelemetryService } from './telemetry.service.js'

@Module({
  imports: [AuthModule],
  controllers: [TelemetryController],
  providers: [TelemetryService, { provide: APP_FILTER, useClass: ServerErrorsFilter }],
})
export class TelemetryModule {}
