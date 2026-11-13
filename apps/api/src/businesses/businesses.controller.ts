import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { AuthGuard, CurrentCustomer } from '../auth/auth.guard.js'
import { Cached } from '../cache/cached.decorator.js'
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
  @Cached({ ttl: 60, tags: ['catalog'], maxAge: 30 })
  @Get()
  @SkipThrottle()
  list(@Query({ schema: catalogQuerySchema }) query: CatalogQuery) {
    return this.businesses.listCatalog(query)
  }

  @Cached({ ttl: 60, tags: ['catalog'], maxAge: 30 })
  @Get('offers')
  @SkipThrottle()
  offers(@Query({ schema: catalogQuerySchema }) query: CatalogQuery) {
    return this.businesses.listOffers(query)
  }

  @Cached({ ttl: 300, tags: ['catalog'], maxAge: 120 })
  @Get('popular-services')
  @SkipThrottle()
  popularServices(@Query({ schema: catalogQuerySchema }) query: CatalogQuery) {
    return this.businesses.listPopularServices(query.kind)
  }

  @Get('slug-available')
  checkSlug(@Query({ schema: slugQuerySchema }) query: SlugQuery) {
    return this.businesses.checkSlug(query.slug)
  }

  @Cached({ ttl: 60, tags: ['catalog'], maxAge: 30 })
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
