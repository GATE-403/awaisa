import type { CalendarFeed, CalendarFeedLink } from '@awaisa/contracts'
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common'
import { CurrentCustomer } from '../auth/auth.guard.js'
import type { Business } from '../businesses/business.entity.js'
import {
  BusinessAccessGuard,
  CurrentBusiness,
  OwnerOnly,
} from '../businesses/business-access.guard.js'
import type { Specialist } from '../catalog/specialist.entity.js'
import type { Customer } from '../customers/customer.entity.js'
import { CurrentMaster, MasterGuard } from '../master/master.guard.js'
import { type FeedInput, feedSchema, type PhonesInput, phonesSchema } from './calendar.schemas.js'
import { CalendarFeedsService, type FeedOwner } from './calendar-feeds.service.js'

const masterOwner = (business: Business, master: Specialist, customer: Customer): FeedOwner => ({
  kind: 'master',
  businessId: business.id,
  specialistId: master.id,
  customerId: customer.id,
})

const memberOwner = (business: Business, customer: Customer) => ({
  kind: 'business' as const,
  businessId: business.id,
  customerId: customer.id,
})

@Controller()
export class CalendarController {
  constructor(private readonly feeds: CalendarFeedsService) {}

  /** The secret subscription address calendar apps poll; no session, the token is the key. */
  @Get('calendar/:file')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Cache-Control', 'private, max-age=300')
  @Header('X-Robots-Tag', 'noindex')
  feed(@Param('file') file: string): Promise<string> {
    if (!file.endsWith('.ics')) throw new NotFoundException()
    return this.feeds.render(file.slice(0, -'.ics'.length))
  }

  // A master's own visits («Мой день»).
  @Get('master/:slug/calendar')
  @UseGuards(MasterGuard)
  getMasterFeed(
    @CurrentBusiness() business: Business,
    @CurrentMaster() master: Specialist,
    @CurrentCustomer() customer: Customer,
  ): Promise<CalendarFeed> {
    return this.feeds.getFeed(masterOwner(business, master, customer))
  }

  @Post('master/:slug/calendar')
  @UseGuards(MasterGuard)
  issueMasterFeed(
    @CurrentBusiness() business: Business,
    @CurrentMaster() master: Specialist,
    @CurrentCustomer() customer: Customer,
  ): Promise<CalendarFeedLink> {
    return this.feeds.issue(masterOwner(business, master, customer))
  }

  @Delete('master/:slug/calendar')
  @UseGuards(MasterGuard)
  @HttpCode(204)
  async removeMasterFeed(
    @CurrentBusiness() business: Business,
    @CurrentMaster() master: Specialist,
    @CurrentCustomer() customer: Customer,
  ): Promise<void> {
    await this.feeds.remove(masterOwner(business, master, customer))
  }

  // A member's feed of the business: every visit or one master's; owners and administrators.
  @Get('manage/:slug/calendar')
  @UseGuards(BusinessAccessGuard)
  getMemberFeed(
    @CurrentBusiness() business: Business,
    @CurrentCustomer() customer: Customer,
  ): Promise<CalendarFeed> {
    return this.feeds.getFeed(memberOwner(business, customer))
  }

  @Post('manage/:slug/calendar')
  @UseGuards(BusinessAccessGuard)
  issueMemberFeed(
    @CurrentBusiness() business: Business,
    @CurrentCustomer() customer: Customer,
    @Body({ schema: feedSchema }) body: FeedInput,
  ): Promise<CalendarFeedLink> {
    return this.feeds.issue(memberOwner(business, customer), body.specialistId)
  }

  @Patch('manage/:slug/calendar')
  @UseGuards(BusinessAccessGuard)
  setMemberFilter(
    @CurrentBusiness() business: Business,
    @CurrentCustomer() customer: Customer,
    @Body({ schema: feedSchema }) body: FeedInput,
  ): Promise<CalendarFeed> {
    return this.feeds.setFilter(memberOwner(business, customer), body.specialistId)
  }

  @Delete('manage/:slug/calendar')
  @UseGuards(BusinessAccessGuard)
  @HttpCode(204)
  async removeMemberFeed(
    @CurrentBusiness() business: Business,
    @CurrentCustomer() customer: Customer,
  ): Promise<void> {
    await this.feeds.remove(memberOwner(business, customer))
  }

  /** Whole phone numbers in every feed of the business: the owner's call. */
  @Put('manage/:slug/calendar/phones')
  @UseGuards(BusinessAccessGuard)
  @OwnerOnly()
  async setPhones(
    @CurrentBusiness() business: Business,
    @CurrentCustomer() customer: Customer,
    @Body({ schema: phonesSchema }) body: PhonesInput,
  ): Promise<CalendarFeed> {
    await this.feeds.setPhonesShown(business.id, body.isShown)
    return this.feeds.getFeed(memberOwner(business, customer))
  }
}
