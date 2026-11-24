import type { FiscalReceipt, FiscalSettings } from '@awaisa/contracts'
import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import { RequiresFeature } from '../billing/plan.guard.js'
import type { Business } from '../businesses/business.entity.js'
import {
  BusinessAccessGuard,
  CurrentBusiness,
  OwnerOnly,
} from '../businesses/business-access.guard.js'
import {
  type FiscalSettingsBody,
  fiscalSettingsSchema,
  type ReceiptsQuery,
  receiptsQuerySchema,
} from './fiscal.schemas.js'
import { FiscalService } from './fiscal.service.js'

// The tax settings are the owner's; staff see a visit's receipt and may send a refused one again.
@RequiresFeature('fiscal')
@Controller('manage/:slug/fiscal')
@UseGuards(BusinessAccessGuard)
export class FiscalController {
  constructor(private readonly fiscal: FiscalService) {}

  @Get()
  @OwnerOnly()
  getSettings(@CurrentBusiness() business: Business): Promise<FiscalSettings> {
    return this.fiscal.getSettings(business.id)
  }

  @Put()
  @OwnerOnly()
  saveSettings(
    @CurrentBusiness() business: Business,
    @Body({ schema: fiscalSettingsSchema }) body: FiscalSettingsBody,
  ): Promise<FiscalSettings> {
    return this.fiscal.saveSettings(business.id, body)
  }

  @Get('receipts')
  listReceipts(
    @CurrentBusiness() business: Business,
    @Query({ schema: receiptsQuerySchema }) query: ReceiptsQuery,
  ): Promise<FiscalReceipt[]> {
    return query.bookingId
      ? this.fiscal.listForBooking(business.id, query.bookingId)
      : this.fiscal.listFailed(business.id)
  }

  @Post('receipts/:id/retry')
  @HttpCode(200)
  retry(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FiscalReceipt> {
    return this.fiscal.retry(business.id, id)
  }
}

// The client's receipt by its signed link (`/receipt/<id>?s=` on the web).
@Controller('fiscal/receipts')
export class PublicReceiptsController {
  constructor(private readonly fiscal: FiscalService) {}

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('s') signature: string | undefined,
  ): Promise<FiscalReceipt> {
    if (!signature) throw new NotFoundException('Receipt not found')
    return this.fiscal.publicReceipt(id, signature)
  }
}
