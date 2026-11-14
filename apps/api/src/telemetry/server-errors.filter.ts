import { type ArgumentsHost, Catch, HttpException } from '@nestjs/common'
import { BaseExceptionFilter } from '@nestjs/core'
import type { Request } from 'express'
import { TelemetryService } from './telemetry.service.js'

// Every unexpected failure (a 5xx, not a refused request) is kept with its stack, so a broken
// booking shows up in /telemetry/errors and not only in a log nobody reads.
@Catch()
export class ServerErrorsFilter extends BaseExceptionFilter {
  constructor(private readonly telemetry: TelemetryService) {
    super()
  }

  override catch(exception: unknown, host: ArgumentsHost) {
    const isExpected = exception instanceof HttpException && exception.getStatus() < 500
    if (!isExpected && host.getType() === 'http') {
      const request = host.switchToHttp().getRequest<Request>()
      const error = exception instanceof Error ? exception : new Error(String(exception))
      void this.telemetry.recordError('api', {
        message: `${request.method} ${request.route?.path ?? request.path}: ${error.message}`,
        stack: error.stack ?? '',
        url: request.originalUrl ?? '',
        userAgent: request.headers['user-agent'],
      })
    }
    super.catch(exception, host)
  }
}
