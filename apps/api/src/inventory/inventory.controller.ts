import type { StockItem } from '@awaisa/contracts'
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
import { CurrentCustomer } from '../auth/auth.guard.js'
import { RequiresFeature } from '../billing/plan.guard.js'
import type { Business } from '../businesses/business.entity.js'
import {
  BusinessAccessGuard,
  CurrentBusiness,
  OwnerOnly,
} from '../businesses/business-access.guard.js'
import type { Customer } from '../customers/customer.entity.js'
import {
  type AdjustInput,
  adjustSchema,
  type ReceiveInput,
  receiveSchema,
  type StockItemInput,
  stockItemSchema,
} from './inventory.schemas.js'
import { InventoryService } from './inventory.service.js'

@RequiresFeature('inventory')
@Controller('manage/:slug/stock')
@UseGuards(BusinessAccessGuard)
@OwnerOnly()
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  list(@CurrentBusiness() business: Business): Promise<StockItem[]> {
    return this.inventory.list(business.id)
  }

  @Post()
  create(
    @CurrentBusiness() business: Business,
    @Body({ schema: stockItemSchema }) body: StockItemInput,
  ): Promise<StockItem[]> {
    return this.inventory.create(business.id, body)
  }

  @Put(':id')
  update(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: stockItemSchema }) body: StockItemInput,
  ): Promise<StockItem[]> {
    return this.inventory.update(business.id, id, body)
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentBusiness() business: Business, @Param('id', ParseUUIDPipe) id: string) {
    return this.inventory.remove(business.id, id)
  }

  @Post(':id/receive')
  receive(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: receiveSchema }) body: ReceiveInput,
    @CurrentCustomer() customer: Customer | null,
  ): Promise<StockItem[]> {
    return this.inventory.receive(
      business.id,
      id,
      body.quantity,
      body.unitCost,
      body.expense ? { branchId: body.expense.branchId, createdBy: customer?.id ?? null } : null,
    )
  }

  @Post(':id/adjust')
  adjust(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: adjustSchema }) body: AdjustInput,
  ): Promise<StockItem[]> {
    return this.inventory.adjust(business.id, id, body.quantity)
  }
}
