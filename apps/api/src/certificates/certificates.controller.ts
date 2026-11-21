import type { CertificateOrderCreated, CertificateSale } from '@awaisa/contracts'
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { CurrentCustomer, OptionalAuthGuard } from '../auth/auth.guard.js'
import { Cached } from '../cache/cached.decorator.js'
import { validateEnv } from '../config/env.js'
import type { Customer } from '../customers/customer.entity.js'
import { CertificateSalesService } from './certificate-sales.service.js'
import { type CertificateOrderBody, certificateOrderSchema } from './certificates.schemas.js'

const getOrderRateLimit = () => validateEnv(process.env).BOOKING_RATE_LIMIT_PER_MINUTE

@Controller('businesses/:slug')
export class CertificatesController {
  constructor(private readonly sales: CertificateSalesService) {}

  // The place's page: whether it sells certificates and for how much.
  @Cached({ ttl: 60, tags: ['catalog'], maxAge: 30 })
  @Get('certificate-sale')
  sale(@Param('slug') slug: string): Promise<CertificateSale> {
    return this.sales.saleFor(slug)
  }

  // «Оплатить»: the order waits for its payment; the answer is where to pay.
  @Post('certificate-orders')
  @Throttle({ default: { limit: getOrderRateLimit, ttl: 60_000 } })
  @UseGuards(OptionalAuthGuard)
  order(
    @Param('slug') slug: string,
    @Body({ schema: certificateOrderSchema }) body: CertificateOrderBody,
    @CurrentCustomer() customer: Customer | null,
  ): Promise<CertificateOrderCreated> {
    return this.sales.createOrder(slug, body, customer)
  }
}
