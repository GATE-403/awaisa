import type { MasterPayout, MasterPayScheme } from '@awaisa/contracts'
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
import { RequiresFeature } from '../billing/plan.guard.js'
import type { Business } from '../businesses/business.entity.js'
import {
  BusinessAccessGuard,
  CurrentBusiness,
  OwnerOnly,
} from '../businesses/business-access.guard.js'
import {
  type PayoutInput,
  type PaySchemeInput,
  payoutSchema,
  paySchemeSchema,
} from './payroll.schemas.js'
import { PayrollService } from './payroll.service.js'

// Pay is the owner's: staff see neither the schemes nor the payouts.
@RequiresFeature('payroll')
@Controller('manage/:slug')
@UseGuards(BusinessAccessGuard)
@OwnerOnly()
export class PayrollController {
  constructor(private readonly payroll: PayrollService) {}

  @Get('specialists/:id/pay')
  getScheme(
    @CurrentBusiness() business: Business,
    @Param('id') id: string,
  ): Promise<MasterPayScheme> {
    return this.payroll.getScheme(business.id, id)
  }

  @Put('specialists/:id/pay')
  setScheme(
    @CurrentBusiness() business: Business,
    @Param('id') id: string,
    @Body({ schema: paySchemeSchema }) body: PaySchemeInput,
  ): Promise<MasterPayScheme> {
    return this.payroll.setScheme(business.id, id, body)
  }

  @Post('payouts')
  addPayout(
    @CurrentBusiness() business: Business,
    @Body({ schema: payoutSchema }) body: PayoutInput,
  ): Promise<MasterPayout> {
    return this.payroll.addPayout(business.id, body)
  }

  @Delete('payouts/:id')
  @HttpCode(204)
  async removePayout(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.payroll.removePayout(business.id, id)
  }
}
