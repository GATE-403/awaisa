import { Module } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'
import { AuthModule } from '../auth/auth.module.js'
import { TelegramModule } from '../telegram/telegram.module.js'
import { AlertsService } from './alerts.service.js'
import { ServerErrorsFilter } from './server-errors.filter.js'
import { TelemetryController } from './telemetry.controller.js'
import { TelemetryService } from './telemetry.service.js'

@Module({
  imports: [AuthModule, TelegramModule],
  controllers: [TelemetryController],
  providers: [
    TelemetryService,
    AlertsService,
    { provide: APP_FILTER, useClass: ServerErrorsFilter },
  ],
})
export class TelemetryModule {}
