import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common'
import { CatalogService } from '../catalog/catalog.service.js'
import { MasterScheduleService } from '../catalog/master-schedule.service.js'
import type { Business } from './business.entity.js'
import { BusinessAccessGuard, CurrentBusiness } from './business-access.guard.js'
import {
  type BranchInput,
  branchSchema,
  type CategoryInput,
  categorySchema,
  type HoursInput,
  hoursSchema,
  type LeaveBody,
  leaveSchema,
  type MasterHoursInput,
  masterHoursSchema,
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
    private readonly masterSchedule: MasterScheduleService,
  ) {}

  @Get()
  async get(@CurrentBusiness() business: Business) {
    return {
      business: await this.businesses.toFullView(business, { includeInactive: true }),
      catalog: await this.catalog.getCatalog(business.id, { includeInactive: true }),
    }
  }

  @Post('branches')
  createBranch(
    @CurrentBusiness() business: Business,
    @Body({ schema: branchSchema }) body: BranchInput,
  ) {
    return this.businesses.saveBranch(business, body)
  }

  @Put('branches/:id')
  updateBranch(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: branchSchema }) body: BranchInput,
  ) {
    return this.businesses.saveBranch(business, body, id)
  }

  @Delete('branches/:id')
  @HttpCode(204)
  deleteBranch(@CurrentBusiness() business: Business, @Param('id', ParseUUIDPipe) id: string) {
    return this.businesses.deleteBranch(business, id)
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

  @Get('specialists/:id/schedule')
  getMasterSchedule(@CurrentBusiness() business: Business, @Param('id') id: string) {
    return this.masterSchedule.getSchedule(business.id, id)
  }

  @Put('specialists/:id/hours')
  setMasterHours(
    @CurrentBusiness() business: Business,
    @Param('id') id: string,
    @Body({ schema: masterHoursSchema }) body: MasterHoursInput,
  ) {
    return this.masterSchedule.setHours(business.id, id, body)
  }

  @Post('specialists/:id/leaves')
  addLeave(
    @CurrentBusiness() business: Business,
    @Param('id') id: string,
    @Body({ schema: leaveSchema }) body: LeaveBody,
  ) {
    return this.masterSchedule.addLeave(business.id, id, body)
  }

  @Delete('specialists/:id/leaves/:leaveId')
  @HttpCode(204)
  async removeLeave(
    @CurrentBusiness() business: Business,
    @Param('id') id: string,
    @Param('leaveId', ParseUUIDPipe) leaveId: string,
  ) {
    await this.masterSchedule.removeLeave(business.id, id, leaveId)
  }
}
