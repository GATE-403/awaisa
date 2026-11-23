import type { BusinessDeleted } from '@awaisa/contracts'
import { Controller, Delete, UseGuards } from '@nestjs/common'
import type { Business } from '../businesses/business.entity.js'
import {
  BusinessAccessGuard,
  CurrentBusiness,
  OwnerOnly,
} from '../businesses/business-access.guard.js'
import { BusinessErasureService } from './business-erasure.service.js'

@Controller('manage/:slug')
@UseGuards(BusinessAccessGuard)
export class BusinessErasureController {
  constructor(private readonly erasure: BusinessErasureService) {}

  @Delete()
  @OwnerOnly()
  delete(@CurrentBusiness() business: Business): Promise<BusinessDeleted> {
    return this.erasure.delete(business)
  }
}
