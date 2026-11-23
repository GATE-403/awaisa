import type { BusinessDeleted } from '@awaisa/contracts'
import { BadRequestException, Body, Controller, Delete, UseGuards } from '@nestjs/common'
import type { Business } from '../businesses/business.entity.js'
import {
  BusinessAccessGuard,
  CurrentBusiness,
  OwnerOnly,
} from '../businesses/business-access.guard.js'
import { CONFIRM_MESSAGE, confirmsDeletion } from './business-erasure.js'
import { type DeleteBusinessInput, deleteBusinessSchema } from './business-erasure.schemas.js'
import { BusinessErasureService } from './business-erasure.service.js'

@Controller('manage/:slug')
@UseGuards(BusinessAccessGuard)
export class BusinessErasureController {
  constructor(private readonly erasure: BusinessErasureService) {}

  @Delete()
  @OwnerOnly()
  delete(
    @CurrentBusiness() business: Business,
    @Body({ schema: deleteBusinessSchema }) body: DeleteBusinessInput,
  ): Promise<BusinessDeleted> {
    if (!confirmsDeletion(body.confirmSlug, business.slug)) {
      throw new BadRequestException(CONFIRM_MESSAGE)
    }
    return this.erasure.delete(business)
  }
}
