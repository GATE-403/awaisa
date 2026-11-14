import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import type { Business } from '../businesses/business.entity.js'
import { BusinessesService } from '../businesses/businesses.service.js'
import type { Customer } from '../customers/customer.entity.js'
import { TelegramBotService } from '../telegram/telegram-bot.service.js'
import { questionText } from '../telegram/telegram-messages.js'

type Row = {
  id: string
  authorName: string
  text: string
  answer: string | null
  answeredAt: Date | null
  createdAt: Date
}

// The public list keeps to answered questions: a question without an answer helps nobody yet.
const PUBLIC_LIMIT = 20
// One client cannot flood a place: three open questions at a time.
const OPEN_PER_CLIENT = 3

const toAuthorName = (name: string) => {
  const [first = '', last = ''] = name.trim().split(/\s+/)
  return last ? `${first} ${last.charAt(0).toUpperCase()}.` : first || 'Клиент'
}

const toView = (row: Row) => ({
  id: row.id,
  authorName: row.authorName,
  text: row.text,
  answer: row.answer,
  answeredAt: row.answeredAt ? new Date(row.answeredAt).toISOString() : null,
  createdAt: new Date(row.createdAt).toISOString(),
})

const COLUMNS = `"id", "author_name" AS "authorName", "text", "answer", "answered_at" AS "answeredAt",
  "created_at" AS "createdAt"`

/** «Вопросы» on a business page: signed-in clients ask, the owner answers from the cabinet. */
@Injectable()
export class QuestionsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly businesses: BusinessesService,
    private readonly telegram: TelegramBotService,
  ) {}

  async listPublic(slug: string) {
    const business = await this.businesses.findBySlug(slug)
    const rows = (await this.dataSource.query(
      `SELECT ${COLUMNS} FROM "business_questions"
       WHERE "business_id" = $1 AND "answer" IS NOT NULL
       ORDER BY "answered_at" DESC LIMIT ${PUBLIC_LIMIT}`,
      [business.id],
    )) as Row[]
    const [total] = (await this.dataSource.query(
      `SELECT COUNT(*)::int AS "count" FROM "business_questions"
       WHERE "business_id" = $1 AND "answer" IS NOT NULL`,
      [business.id],
    )) as { count: number }[]

    return { count: total?.count ?? 0, items: rows.map(toView) }
  }

  async ask(slug: string, customer: Customer, text: string) {
    const business = await this.businesses.findBySlug(slug)
    const [open] = (await this.dataSource.query(
      `SELECT COUNT(*)::int AS "count" FROM "business_questions"
       WHERE "business_id" = $1 AND "customer_id" = $2 AND "answer" IS NULL`,
      [business.id, customer.id],
    )) as { count: number }[]
    if ((open?.count ?? 0) >= OPEN_PER_CLIENT) {
      throw new ConflictException('Дождитесь ответа на прошлые вопросы')
    }
    const authorName = toAuthorName(customer.name)
    const [row] = (await this.dataSource.query(
      `INSERT INTO "business_questions" ("business_id", "customer_id", "author_name", "text")
       VALUES ($1, $2, $3, $4) RETURNING ${COLUMNS}`,
      [business.id, customer.id, authorName, text],
    )) as Row[]
    void this.telegram.notifyBusiness(business.id, questionText(business.name, authorName, text))

    return toView(row as Row)
  }

  /** The cabinet: every question, open ones first. */
  async listForManage(business: Business) {
    const rows = (await this.dataSource.query(
      `SELECT ${COLUMNS} FROM "business_questions" WHERE "business_id" = $1
       ORDER BY ("answer" IS NULL) DESC, "created_at" DESC LIMIT 200`,
      [business.id],
    )) as Row[]

    return rows.map(toView)
  }

  /** An empty answer takes the question off the page again. */
  async answer(business: Business, id: string, text: string) {
    const rows = (await this.dataSource.query(
      `UPDATE "business_questions"
       SET "answer" = NULLIF($3, ''), "answered_at" = CASE WHEN $3 = '' THEN NULL ELSE now() END
       WHERE "id" = $1 AND "business_id" = $2 RETURNING ${COLUMNS}`,
      [id, business.id, text],
    )) as [Row[], number] | Row[]
    const [row] = Array.isArray(rows[0]) ? (rows[0] as Row[]) : (rows as Row[])
    if (!row) throw new NotFoundException('Вопрос не найден')

    return toView(row)
  }

  async remove(business: Business, id: string) {
    const rows = (await this.dataSource.query(
      `DELETE FROM "business_questions" WHERE "id" = $1 AND "business_id" = $2 RETURNING "id"`,
      [id, business.id],
    )) as [unknown[], number] | unknown[]
    const removed = Array.isArray(rows[0]) ? (rows[0] as unknown[]) : rows
    if (removed.length === 0) throw new NotFoundException('Вопрос не найден')
  }
}
