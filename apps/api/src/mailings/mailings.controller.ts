import type {
  BirthdayGreeting,
  MailingPreview,
  MailingSent,
  MailingsOverview,
} from '@awaisa/contracts'
import { Body, Controller, Get, Post, Put, Query, UseGuards } from '@nestjs/common'
import type { Business } from '../businesses/business.entity.js'
import {
  BusinessAccessGuard,
  CurrentBusiness,
  OwnerOnly,
} from '../businesses/business-access.guard.js'
import {
  type BirthdayGreetingInput,
  birthdayGreetingSchema,
  type PreviewQuery,
  previewQuerySchema,
  type SendMailingInput,
  sendMailingSchema,
} from './mailings.schemas.js'
import { MailingsService } from './mailings.service.js'

@Controller('manage/:slug/mailings')
@OwnerOnly()
@UseGuards(BusinessAccessGuard)
export class MailingsController {
  constructor(private readonly mailings: MailingsService) {}

  @Get()
  async overview(@CurrentBusiness() business: Business): Promise<MailingsOverview> {
    const [history, greeting] = await Promise.all([
      this.mailings.history(business.id),
      this.mailings.getBirthdayGreeting(business.id),
    ])
    return { history, birthdayGreeting: greeting.text }
  }

  @Get('preview')
  preview(
    @CurrentBusiness() business: Business,
    @Query({ schema: previewQuerySchema }) query: PreviewQuery,
  ): Promise<MailingPreview> {
    return this.mailings.preview(business.id, query.segment, query.days)
  }

  @Post()
  send(
    @CurrentBusiness() business: Business,
    @Body({ schema: sendMailingSchema }) body: SendMailingInput,
  ): Promise<MailingSent> {
    return this.mailings.send(business, body.segment, body.days, body.text)
  }

  @Put('birthday')
  setBirthday(
    @CurrentBusiness() business: Business,
    @Body({ schema: birthdayGreetingSchema }) body: BirthdayGreetingInput,
  ): Promise<BirthdayGreeting> {
    return this.mailings.setBirthdayGreeting(business.id, body.text)
  }
}
