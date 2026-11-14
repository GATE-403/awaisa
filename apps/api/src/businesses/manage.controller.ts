import type {
  Branch,
  BusinessPage,
  BusinessProfile,
  Category,
  CreatedId,
  CreatedLeave,
  MasterSchedule,
} from '@awaisa/contracts'
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
import { ConfigService } from '@nestjs/config'
import { CatalogService } from '../catalog/catalog.service.js'
import { MasterScheduleService } from '../catalog/master-schedule.service.js'
import type { Env } from '../config/env.js'
import { masterInviteMessage } from '../notifications/messages.js'
import { SmsService } from '../notifications/sms.service.js'
import type { Business } from './business.entity.js'
import {
  BusinessAccessGuard,
  CurrentBusiness,
  CurrentRole,
  OwnerOnly,
} from './business-access.guard.js'
import type { MemberRole } from './business-member.entity.js'
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
    private readonly sms: SmsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Get()
  async get(
    @CurrentBusiness() business: Business,
    @CurrentRole() role: MemberRole,
  ): Promise<BusinessPage> {
    return {
      // The cabinet hides money and setup from administrators; the API refuses them too.
      role,
      business: await this.businesses.toFullView(business, { includeInactive: true }),
      catalog: await this.catalog.getCatalog(business.id, { includeInactive: true }),
    }
  }

  @OwnerOnly()
  @Post('branches')
  createBranch(
    @CurrentBusiness() business: Business,
    @Body({ schema: branchSchema }) body: BranchInput,
  ): Promise<Branch> {
    return this.businesses.saveBranch(business, body)
  }

  @OwnerOnly()
  @Put('branches/:id')
  updateBranch(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: branchSchema }) body: BranchInput,
  ): Promise<Branch> {
    return this.businesses.saveBranch(business, body, id)
  }

  @OwnerOnly()
  @Delete('branches/:id')
  @HttpCode(204)
  deleteBranch(@CurrentBusiness() business: Business, @Param('id', ParseUUIDPipe) id: string) {
    return this.businesses.deleteBranch(business, id)
  }

  @OwnerOnly()
  @Patch()
  update(
    @CurrentBusiness() business: Business,
    @Body({ schema: updateBusinessSchema }) body: UpdateBusinessInput,
  ): Promise<BusinessProfile> {
    return this.businesses.update(business, body)
  }

  @OwnerOnly()
  @Put('hours')
  setHours(
    @CurrentBusiness() business: Business,
    @Body({ schema: hoursSchema }) body: HoursInput,
  ): Promise<BusinessProfile> {
    return this.businesses.setHours(business, body)
  }

  @OwnerOnly()
  @Post('categories')
  createCategory(
    @CurrentBusiness() business: Business,
    @Body({ schema: categorySchema }) body: CategoryInput,
  ): Promise<Category> {
    return this.catalog.createCategory(business.id, body)
  }

  @OwnerOnly()
  @Patch('categories/:id')
  @HttpCode(204)
  updateCategory(
    @CurrentBusiness() business: Business,
    @Param('id') id: string,
    @Body({ schema: categorySchema }) body: CategoryInput,
  ) {
    return this.catalog.updateCategory(business.id, id, body)
  }

  @OwnerOnly()
  @Delete('categories/:id')
  @HttpCode(204)
  deleteCategory(@CurrentBusiness() business: Business, @Param('id') id: string) {
    return this.catalog.deleteCategory(business.id, id)
  }

  @OwnerOnly()
  @Post('services')
  createService(
    @CurrentBusiness() business: Business,
    @Body({ schema: serviceSchema }) body: ServiceInput,
  ): Promise<CreatedId> {
    return this.catalog.createService(business.id, body)
  }

  @OwnerOnly()
  @Put('services/:id')
  @HttpCode(204)
  updateService(
    @CurrentBusiness() business: Business,
    @Param('id') id: string,
    @Body({ schema: serviceSchema }) body: ServiceInput,
  ) {
    return this.catalog.updateService(business.id, id, body)
  }

  @OwnerOnly()
  @Post('specialists')
  async createSpecialist(
    @CurrentBusiness() business: Business,
    @Body({ schema: specialistSchema }) body: SpecialistInput,
  ): Promise<CreatedId> {
    const saved = await this.catalog.saveSpecialist(business.id, body)
    this.inviteMaster(business, saved)
    return { id: saved.id }
  }

  @OwnerOnly()
  @Put('specialists/:id')
  @HttpCode(204)
  async updateSpecialist(
    @CurrentBusiness() business: Business,
    @Param('id') id: string,
    @Body({ schema: specialistSchema }) body: SpecialistInput,
  ) {
    this.inviteMaster(business, await this.catalog.saveSpecialist(business.id, body, id))
  }

  private inviteMaster(business: Business, master: { phone: string | null; isNewLogin: boolean }) {
    if (!master.isNewLogin || !master.phone) return
    const link = `${this.config.get('PUBLIC_WEB_URL', { infer: true })}/master`
    void this.sms.sendSafely(master.phone, masterInviteMessage(business.name, link))
  }

  @Get('specialists/:id/schedule')
  getMasterSchedule(
    @CurrentBusiness() business: Business,
    @Param('id') id: string,
  ): Promise<MasterSchedule> {
    return this.masterSchedule.getSchedule(business.id, id)
  }

  @OwnerOnly()
  @Put('specialists/:id/hours')
  setMasterHours(
    @CurrentBusiness() business: Business,
    @Param('id') id: string,
    @Body({ schema: masterHoursSchema }) body: MasterHoursInput,
  ): Promise<MasterSchedule> {
    return this.masterSchedule.setHours(business.id, id, body)
  }

  @Post('specialists/:id/leaves')
  addLeave(
    @CurrentBusiness() business: Business,
    @Param('id') id: string,
    @Body({ schema: leaveSchema }) body: LeaveBody,
  ): Promise<CreatedLeave> {
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
