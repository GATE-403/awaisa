import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { AuthGuard, CurrentCustomer } from '../auth/auth.guard.js'
import { CatalogService } from '../catalog/catalog.service.js'
import type { Customer } from '../customers/customer.entity.js'
import {
  type CatalogQuery,
  type CreateBusinessInput,
  catalogQuerySchema,
  createBusinessSchema,
  type SlugQuery,
  slugQuerySchema,
} from './businesses.schemas.js'
import { BusinessesService } from './businesses.service.js'

@Controller('businesses')
export class BusinessesController {
  constructor(
    private readonly businesses: BusinessesService,
    private readonly catalog: CatalogService,
  ) {}

  // The web server renders these for every visitor from one IP, so a per-IP limit would throttle everyone.
  @Get()
  @SkipThrottle()
  list(@Query({ schema: catalogQuerySchema }) query: CatalogQuery) {
    return this.businesses.listCatalog(query)
  }

  @Get('slug-available')
  checkSlug(@Query({ schema: slugQuerySchema }) query: SlugQuery) {
    return this.businesses.checkSlug(query.slug)
  }

  @Get(':slug')
  @SkipThrottle()
  async getOne(@Param('slug') slug: string) {
    const business = await this.businesses.findBySlug(slug)

    return {
      business: await this.businesses.toFullView(business),
      catalog: await this.catalog.getCatalog(business.id),
    }
  }

  @Post()
  @UseGuards(AuthGuard)
  create(
    @Body({ schema: createBusinessSchema }) body: CreateBusinessInput,
    @CurrentCustomer() customer: Customer,
  ) {
    return this.businesses.create(body, customer)
  }
}
