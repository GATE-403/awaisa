import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { CacheService } from '../cache/cache.service.js'
import { onJobFailure } from '../runtime/job-failures.js'
import { RuntimeService } from '../runtime/runtime.service.js'
import { TelegramBotService } from '../telegram/telegram-bot.service.js'
import { type ErrorGroup, errorsAlertText, redisAlertText } from './alert-messages.js'
import { TelemetryService } from './telemetry.service.js'

const CHECK_MINUTES = 5
// The same error is reported again only after an hour of it going on.
const REPEAT_AFTER_MS = 60 * 60_000
// Browsers break for reasons of their own (extensions, old phones, bad networks): one error is
// noise, a burst within a check is a broken release.
const WEB_BURST = 10

/**
 * The platform's own alarms, in the jobs process: new server errors, a burst of browser errors,
 * failed cron jobs and an unreachable Redis go to ALERT_TELEGRAM_CHAT_ID. It cannot tell that
 * the whole server is down - the GitHub uptime check (.github/workflows/uptime.yml) does that.
 */
@Injectable()
export class AlertsService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(AlertsService.name)
  private checkedAt = new Date()
  private readonly reportedAt = new Map<string, number>()
  private stopListening: (() => void) | null = null

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly telemetry: TelemetryService,
    private readonly telegram: TelegramBotService,
    private readonly cache: CacheService,
    private readonly runtime: RuntimeService,
  ) {}

  onApplicationBootstrap() {
    if (!this.runtime.runsJobs) return
    this.stopListening = onJobFailure((failure) => {
      void this.telemetry.recordError('api', {
        message: `Cron: ${failure.message}`,
        stack: failure.stack,
      })
    })
  }

  onApplicationShutdown() {
    this.stopListening?.()
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkErrors() {
    const since = this.checkedAt
    this.checkedAt = new Date()
    try {
      const groups = (await this.dataSource.query(
        `SELECT "source", "message", COUNT(*)::int AS "count" FROM "app_errors"
         WHERE "created_at" > $1 GROUP BY "source", "message" ORDER BY COUNT(*) DESC LIMIT 30`,
        [since],
      )) as ErrorGroup[]
      const webTotal = groups
        .filter((group) => group.source === 'web')
        .reduce((sum, group) => sum + group.count, 0)
      const fresh = groups.filter(
        (group) =>
          (group.source !== 'web' || webTotal >= WEB_BURST) &&
          this.isDue(`${group.source}:${group.message}`),
      )
      if (fresh.length === 0) return
      await this.telegram.sendAlert(errorsAlertText(fresh, CHECK_MINUTES))
    } catch (error) {
      this.logger.warn(`Error check failed: ${String(error)}`)
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkRedis() {
    if (!process.env.REDIS_URL) return
    const redis = this.cache.redisClient
    const problem = redis
      ? await redis.ping().then(
          () => null,
          (error: unknown) => String(error),
        )
      : 'не подключился при старте'
    if (problem && this.isDue('redis')) await this.telegram.sendAlert(redisAlertText(problem))
  }

  private isDue(key: string) {
    const last = this.reportedAt.get(key)
    if (last !== undefined && Date.now() - last < REPEAT_AFTER_MS) return false
    this.reportedAt.set(key, Date.now())
    return true
  }
}
