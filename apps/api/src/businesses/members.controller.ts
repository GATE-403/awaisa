import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { z } from 'zod'
import { CurrentCustomer } from '../auth/auth.guard.js'
import { normalizePhone } from '../common/phone.js'
import type { Env } from '../config/env.js'
import type { Customer } from '../customers/customer.entity.js'
import { adminInviteMessage } from '../notifications/messages.js'
import { SmsService } from '../notifications/sms.service.js'
import type { Business } from './business.entity.js'
import { BusinessAccessGuard, CurrentBusiness, OwnerOnly } from './business-access.guard.js'

const addMemberSchema = z.object({ phone: z.string().trim().min(5).max(32) })

type AddMemberInput = z.infer<typeof addMemberSchema>

// The team: the owner adds administrators by phone; they sign in by SMS like anyone else and
// get the cabinet without money or settings.
@Controller('manage/:slug/members')
@UseGuards(BusinessAccessGuard)
@OwnerOnly()
export class MembersController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly sms: SmsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Get()
  list(@CurrentBusiness() business: Business) {
    return this.members(business.id)
  }

  @Post()
  async add(
    @CurrentBusiness() business: Business,
    @Body({ schema: addMemberSchema }) body: AddMemberInput,
  ) {
    const phone = normalizePhone(body.phone)
    if (!phone) throw new BadRequestException('Проверьте номер телефона')
    // The number may never have signed in: it gets an account now, named when it first does.
    const [customer] = (await this.dataSource.query(
      `INSERT INTO "customers" ("phone") VALUES ($1)
       ON CONFLICT ("phone") DO UPDATE SET "phone" = EXCLUDED."phone" RETURNING "id"`,
      [phone],
    )) as { id: string }[]
    const inserted = (await this.dataSource.query(
      `INSERT INTO "business_members" ("business_id", "customer_id", "role") VALUES ($1, $2, 'staff')
       ON CONFLICT DO NOTHING RETURNING "customer_id"`,
      [business.id, customer?.id],
    )) as unknown[]
    if (inserted.length > 0) {
      const link = `${this.config.get('PUBLIC_WEB_URL', { infer: true })}/manage/${business.slug}`
      void this.sms.sendSafely(phone, adminInviteMessage(business.name, link))
    }
    return this.members(business.id)
  }

  @Delete(':customerId')
  @HttpCode(204)
  async remove(
    @CurrentBusiness() business: Business,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @CurrentCustomer() me: Customer,
  ) {
    if (customerId === me.id) throw new BadRequestException('Себя удалить нельзя')
    // Only administrators leave this way; the owner stays.
    await this.dataSource.query(
      `DELETE FROM "business_members" WHERE "business_id" = $1 AND "customer_id" = $2 AND "role" = 'staff'`,
      [business.id, customerId],
    )
  }

  private async members(businessId: string) {
    const rows = (await this.dataSource.query(
      `SELECT c."id", c."phone", c."name", m."role", m."created_at" AS "createdAt"
       FROM "business_members" m JOIN "customers" c ON c."id" = m."customer_id"
       WHERE m."business_id" = $1 ORDER BY m."role" = 'owner' DESC, m."created_at"`,
      [businessId],
    )) as { id: string; phone: string; name: string; role: string; createdAt: Date }[]
    return rows.map((row) => ({
      id: row.id,
      phone: row.phone,
      name: row.name,
      role: row.role === 'owner' ? 'owner' : 'admin',
    }))
  }
}
