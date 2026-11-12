import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import { CurrentCustomer, OptionalAuthGuard } from '../auth/auth.guard.js'
import type { Business } from '../businesses/business.entity.js'
import {
  BusinessAccessGuard,
  CurrentBusiness,
  OwnerOnly,
} from '../businesses/business-access.guard.js'
import type { Customer } from '../customers/customer.entity.js'
import {
  type PromotionInput,
  promotionSchema,
  type QuoteQuery,
  quoteQuerySchema,
} from './promotions.schemas.js'
import { PromotionsService } from './promotions.service.js'

@Controller()
export class PromotionsController {
  constructor(private readonly promotions: PromotionsService) {}

  // The booking form's price line: the discount this visit gets and whether the code works.
  @Get('promotions/quote')
  @UseGuards(OptionalAuthGuard)
  quote(
    @Query({ schema: quoteQuerySchema }) query: QuoteQuery,
    @CurrentCustomer() customer: Customer | null,
  ) {
    return this.promotions.quote(query, customer?.phone ?? null)
  }

  // The business page's «Акции» line: what is on now, without codes.
  @Get('businesses/:slug/promotions')
  listPublic(@Param('slug') slug: string) {
    return this.promotions.publicForSlug(slug)
  }
}

@Controller('manage/:slug/promotions')
@OwnerOnly()
@UseGuards(BusinessAccessGuard)
export class ManagePromotionsController {
  constructor(private readonly promotions: PromotionsService) {}

  @Get()
  list(@CurrentBusiness() business: Business) {
    return this.promotions.list(business.id)
  }

  @Post()
  create(
    @CurrentBusiness() business: Business,
    @Body({ schema: promotionSchema }) body: PromotionInput,
  ) {
    return this.promotions.create(business.id, body)
  }

  @Put(':id')
  update(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: promotionSchema }) body: PromotionInput,
  ) {
    return this.promotions.update(business.id, id, body)
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentBusiness() business: Business, @Param('id', ParseUUIDPipe) id: string) {
    return this.promotions.remove(business.id, id)
  }
}
