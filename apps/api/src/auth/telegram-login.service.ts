import { createHash } from 'node:crypto'
import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm'
import { DataSource, LessThan, Repository } from 'typeorm'
import { normalizePhone } from '../common/phone.js'
import type { Env } from '../config/env.js'
import { SmsService } from '../notifications/sms.service.js'
import { AuthService } from './auth.service.js'
import { TelegramLogin } from './telegram-login.entity.js'
import { isLoginToken, LOGIN_TTL_MINUTES } from './telegram-login.js'

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

// `UPDATE … RETURNING` through TypeORM answers `[rows, count]` on Postgres.
const returnedRows = <Row>(result: unknown) =>
  (Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result) as Row[]

type ContactResult = 'confirmed' | 'refused' | 'none'

type CheckResult =
  | { status: 'pending' | 'expired' }
  | { status: 'signedIn'; session: Awaited<ReturnType<AuthService['openSession']>> }

/**
 * «Войти через Telegram» through the owners' bot: the page registers its token, the bot's
 * `/start login_<token>` ties a chat to it, the person shares their own number there, and the
 * page trades the token for a session — the same account as signing in by SMS on that number.
 */
@Injectable()
export class TelegramLoginService {
  constructor(
    @InjectRepository(TelegramLogin) private readonly logins: Repository<TelegramLogin>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly auth: AuthService,
    private readonly sms: SmsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  get botUsername() {
    return this.config.get('TELEGRAM_BOT_USERNAME', { infer: true }) ?? null
  }

  async register(token: string) {
    if (!this.botUsername) throw new BadRequestException('Вход через Telegram сейчас недоступен')
    if (!isLoginToken(token)) throw new BadRequestException('Неверная ссылка для входа')
    await this.logins.delete({ expiresAt: LessThan(new Date(Date.now() - 24 * 60 * 60_000)) })
    await this.logins
      .createQueryBuilder()
      .insert()
      .values({
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + LOGIN_TTL_MINUTES * 60_000),
      })
      .orIgnore()
      .execute()
  }

  /** The bot's `/start login_<token>`: false when the link is old or unknown. */
  async attachChat(token: string, chatId: string) {
    const result = await this.logins
      .createQueryBuilder()
      .update()
      .set({ chatId })
      .where('token_hash = :hash AND status = :status AND expires_at > now()', {
        hash: sha256(token),
        status: 'pending',
      })
      .execute()
    return (result.affected ?? 0) > 0
  }

  /** The number shared in the chat confirms the chat's latest open sign-in. */
  async confirmContact(chatId: string, rawPhone: string): Promise<ContactResult> {
    const phone = normalizePhone(rawPhone)
    if (!phone || !this.sms.canSendTo(phone)) return 'refused'
    const rows = returnedRows<{ id: string }>(
      await this.dataSource.query(
        `UPDATE "telegram_logins" SET "phone" = $2, "status" = 'confirmed'
       WHERE "id" = (
         SELECT "id" FROM "telegram_logins"
         WHERE "chat_id" = $1 AND "status" = 'pending' AND "expires_at" > now()
         ORDER BY "created_at" DESC LIMIT 1
       )
       RETURNING "id"`,
        [chatId, phone],
      ),
    )
    return rows.length > 0 ? 'confirmed' : 'none'
  }

  /**
   * The number this chat has already shared to sign in (its own contact, checked then), so the
   * next sign-in from the same chat does not ask again. Null after `/stop` or never shared.
   */
  async rememberedPhone(chatId: string) {
    const [row] = (await this.dataSource.query(
      `SELECT "phone" FROM "telegram_logins"
       WHERE "chat_id" = $1 AND "phone" IS NOT NULL
       ORDER BY "created_at" DESC LIMIT 1`,
      [chatId],
    )) as { phone: string }[]
    return row?.phone ?? null
  }

  /** `/stop` in the bot: the chat's number is forgotten, the next sign-in asks for it again. */
  async forgetChat(chatId: string) {
    await this.dataSource.query(
      `UPDATE "telegram_logins" SET "phone" = NULL
       WHERE "chat_id" = $1 AND "status" <> 'confirmed'`,
      [chatId],
    )
  }

  /** What the page sees while it waits; a confirmed token opens a session once. */
  async check(token: string): Promise<CheckResult> {
    if (!isLoginToken(token)) return { status: 'expired' }
    const hash = sha256(token)
    const login = await this.logins.findOneBy({ tokenHash: hash })
    if (!login || login.status === 'used') return { status: 'expired' }
    if (login.status === 'pending') {
      return login.expiresAt > new Date() ? { status: 'pending' } : { status: 'expired' }
    }
    // Taken in one statement, so two tabs polling at once cannot both sign in.
    const taken = returnedRows<{ phone: string }>(
      await this.dataSource.query(
        `UPDATE "telegram_logins" SET "status" = 'used'
       WHERE "token_hash" = $1 AND "status" = 'confirmed' RETURNING "phone"`,
        [hash],
      ),
    )
    const phone = taken[0]?.phone
    if (!phone) return { status: 'expired' }

    return { status: 'signedIn', session: await this.auth.openSession(phone) }
  }
}
