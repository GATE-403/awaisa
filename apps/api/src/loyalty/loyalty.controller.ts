import type {
  CertificateSaleSettings,
  ClientLoyalty,
  GiftCertificate,
  LoyaltyOverview,
  LoyaltySettings,
  MyLoyalty,
  SubscriptionPlan,
} from '@awaisa/contracts'
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
  UseGuards,
} from '@nestjs/common'
import { AuthGuard, CurrentCustomer } from '../auth/auth.guard.js'
import type { Business } from '../businesses/business.entity.js'
import {
  BusinessAccessGuard,
  CurrentBusiness,
  OwnerOnly,
} from '../businesses/business-access.guard.js'
import {
  type CertificateSaleInput,
  certificateSaleSchema,
} from '../certificates/certificates.schemas.js'
import type { Customer } from '../customers/customer.entity.js'
import {
  type CertificateInput,
  certificateSchema,
  type LoyaltySettingsInput,
  loyaltySettingsSchema,
  type PlanInput,
  planSchema,
  type SellSubscriptionInput,
  sellSubscriptionSchema,
} from './loyalty.schemas.js'
import { LoyaltyService } from './loyalty.service.js'

@Controller('manage/:slug/loyalty')
@UseGuards(BusinessAccessGuard)
export class ManageLoyaltyController {
  constructor(private readonly loyalty: LoyaltyService) {}

  @Get()
  async overview(@CurrentBusiness() business: Business): Promise<LoyaltyOverview> {
    const [settings, plans, certificates, certificateSale] = await Promise.all([
      this.loyalty.getSettings(business.id),
      this.loyalty.listPlans(business.id),
      this.loyalty.listCertificates(business.id),
      this.loyalty.getCertificateSale(business.id),
    ])
    return { ...settings, plans, certificates, certificateSale }
  }

  // «Продавать сертификаты онлайн» and the amounts on the place's page.
  @OwnerOnly()
  @Put('certificate-sale')
  setCertificateSale(
    @CurrentBusiness() business: Business,
    @Body({ schema: certificateSaleSchema }) body: CertificateSaleInput,
  ): Promise<CertificateSaleSettings> {
    return this.loyalty.setCertificateSale(business.id, body)
  }

  @OwnerOnly()
  @Put('settings')
  setSettings(
    @CurrentBusiness() business: Business,
    @Body({ schema: loyaltySettingsSchema }) body: LoyaltySettingsInput,
  ): Promise<LoyaltySettings> {
    return this.loyalty.setBonusPercent(business.id, body.bonusPercent)
  }

  @OwnerOnly()
  @Post('plans')
  createPlan(
    @CurrentBusiness() business: Business,
    @Body({ schema: planSchema }) body: PlanInput,
  ): Promise<SubscriptionPlan[]> {
    return this.loyalty.savePlan(business.id, body)
  }

  @OwnerOnly()
  @Put('plans/:id')
  updatePlan(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: planSchema }) body: PlanInput,
  ): Promise<SubscriptionPlan[]> {
    return this.loyalty.savePlan(business.id, body, id)
  }

  @OwnerOnly()
  @Delete('plans/:id')
  @HttpCode(204)
  deletePlan(@CurrentBusiness() business: Business, @Param('id', ParseUUIDPipe) id: string) {
    return this.loyalty.deletePlan(business.id, id)
  }

  @OwnerOnly()
  @Post('certificates')
  issueCertificate(
    @CurrentBusiness() business: Business,
    @Body({ schema: certificateSchema }) body: CertificateInput,
  ): Promise<GiftCertificate> {
    return this.loyalty.issueCertificate(business.id, body)
  }

  @Get('certificates/:code')
  findCertificate(@CurrentBusiness() business: Business, @Param('code') code: string) {
    return this.loyalty.findCertificate(business.id, code)
  }

  @Get('clients/:phone')
  forClient(
    @CurrentBusiness() business: Business,
    @Param('phone') phone: string,
  ): Promise<ClientLoyalty> {
    return this.loyalty.forClient(business.id, phone)
  }

  @Post('clients/:phone/subscriptions')
  sellSubscription(
    @CurrentBusiness() business: Business,
    @Param('phone') phone: string,
    @Body({ schema: sellSubscriptionSchema }) body: SellSubscriptionInput,
  ): Promise<ClientLoyalty> {
    return this.loyalty.sellSubscription(business.id, phone, body.planId)
  }
}

@Controller('me/loyalty')
@UseGuards(AuthGuard)
export class MyLoyaltyController {
  constructor(private readonly loyalty: LoyaltyService) {}

  @Get()
  mine(@CurrentCustomer() customer: Customer): Promise<MyLoyalty> {
    return this.loyalty.forCustomer(customer.phone)
  }
}
