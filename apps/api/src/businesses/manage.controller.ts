import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common'
import { CatalogService } from '../catalog/catalog.service.js'
import type { Business } from './business.entity.js'
import { BusinessAccessGuard, CurrentBusiness } from './business-access.guard.js'
import {
  type CategoryInput,
  categorySchema,
  type HoursInput,
  hoursSchema,
  type ServiceInput,
  type SpecialistInput,
  serviceSchema,
  specialistSchema,
  type UpdateBusinessInput,
  updateBusinessSchema,
} from './businesses.schemas.js'
import { BusinessesService } from './businesses.service.js'

@Controller('manage/:slug')
@UseGuards(BusinessAccessGuard)
export class ManageController {
  constructor(
    private readonly businesses: BusinessesService,
    private readonly catalog: CatalogService,
  ) {}

  @Get()
  async get(@CurrentBusiness() business: Business) {
    return {
      business: this.businesses.toView(business),
      catalog: await this.catalog.getCatalog(business.id, { includeInactive: true }),
    }
  }

  @Patch()
  update(
    @CurrentBusiness() business: Business,
    @Body({ schema: updateBusinessSchema }) body: UpdateBusinessInput,
  ) {
    return this.businesses.update(business, body)
  }

  @Put('hours')
  setHours(@CurrentBusiness() business: Business, @Body({ schema: hoursSchema }) body: HoursInput) {
    return this.businesses.setHours(business, body)
  }

  @Post('categories')
  createCategory(
    @CurrentBusiness() business: Business,
    @Body({ schema: categorySchema }) body: CategoryInput,
  ) {
    return this.catalog.createCategory(business.id, body)
  }

  @Patch('categories/:id')
  @HttpCode(204)
  updateCategory(
    @CurrentBusiness() business: Business,
    @Param('id') id: string,
    @Body({ schema: categorySchema }) body: CategoryInput,
  ) {
    return this.catalog.updateCategory(business.id, id, body)
  }

  @Delete('categories/:id')
  @HttpCode(204)
  deleteCategory(@CurrentBusiness() business: Business, @Param('id') id: string) {
    return this.catalog.deleteCategory(business.id, id)
  }

  @Post('services')
  createService(
    @CurrentBusiness() business: Business,
    @Body({ schema: serviceSchema }) body: ServiceInput,
  ) {
    return this.catalog.createService(business.id, body)
  }

  @Put('services/:id')
  @HttpCode(204)
  updateService(
    @CurrentBusiness() business: Business,
    @Param('id') id: string,
    @Body({ schema: serviceSchema }) body: ServiceInput,
  ) {
    return this.catalog.updateService(business.id, id, body)
  }

  @Post('specialists')
  async createSpecialist(
    @CurrentBusiness() business: Business,
    @Body({ schema: specialistSchema }) body: SpecialistInput,
  ) {
    const { id } = await this.catalog.saveSpecialist(business.id, body)
    return { id }
  }

  @Put('specialists/:id')
  @HttpCode(204)
  async updateSpecialist(
    @CurrentBusiness() business: Business,
    @Param('id') id: string,
    @Body({ schema: specialistSchema }) body: SpecialistInput,
  ) {
    await this.catalog.saveSpecialist(business.id, body, id)
  }
}
