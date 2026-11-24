import type { CoverUpload, LogoUpload, SpecialistPhotoUpload, WorkPhoto } from '@awaisa/contracts'
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Business } from '../businesses/business.entity.js'
import {
  BusinessAccessGuard,
  CurrentBusiness,
  OwnerOnly,
} from '../businesses/business-access.guard.js'
import { MediaUploadsService } from './media-uploads.service.js'
import {
  type ReorderWorkPhotosInput,
  reorderWorkPhotosSchema,
  type UpdateWorkPhotoInput,
  updateWorkPhotoSchema,
} from './work-photos.schemas.js'
import { WorkPhotosService } from './work-photos.service.js'

type UploadedImage = { buffer: Buffer; mimetype: string }

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

const imageUpload = FileInterceptor('file', {
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_request, file, accept) => accept(null, file.mimetype.startsWith('image/')),
})

@Controller('manage/:slug')
@UseGuards(BusinessAccessGuard)
@OwnerOnly()
export class ManageMediaController {
  constructor(
    private readonly uploads: MediaUploadsService,
    private readonly workPhotos: WorkPhotosService,
  ) {}

  @Post('cover')
  @UseInterceptors(imageUpload)
  setCover(
    @CurrentBusiness() business: Business,
    @UploadedFile() file: UploadedImage | undefined,
  ): Promise<CoverUpload> {
    return this.uploads.setCover(business, file)
  }

  @Delete('cover')
  @HttpCode(204)
  removeCover(@CurrentBusiness() business: Business): Promise<void> {
    return this.uploads.removeCover(business)
  }

  // The logo: square, shown round wherever the place appears (catalog, page, bar, booking).
  @Post('logo')
  @UseInterceptors(imageUpload)
  setLogo(
    @CurrentBusiness() business: Business,
    @UploadedFile() file: UploadedImage | undefined,
  ): Promise<LogoUpload> {
    return this.uploads.setLogo(business, file)
  }

  @Delete('logo')
  @HttpCode(204)
  removeLogo(@CurrentBusiness() business: Business): Promise<void> {
    return this.uploads.removeLogo(business)
  }

  /** A photo of a work, optionally tagged with the service and master (multipart fields). */
  @Post('photos')
  @UseInterceptors(imageUpload)
  addPhoto(
    @CurrentBusiness() business: Business,
    @UploadedFile() file: UploadedImage | undefined,
    @Body() body: { serviceId?: string; specialistId?: string },
  ): Promise<WorkPhoto[]> {
    return this.uploads.addWorkPhoto(business, file, {
      serviceId: body?.serviceId || null,
      specialistId: body?.specialistId || null,
    })
  }

  @Get('work-photos')
  listPhotos(@CurrentBusiness() business: Business): Promise<WorkPhoto[]> {
    return this.workPhotos.listForBusiness(business.id)
  }

  @Put('work-photos/order')
  async reorderPhotos(
    @CurrentBusiness() business: Business,
    @Body({ schema: reorderWorkPhotosSchema }) body: ReorderWorkPhotosInput,
  ): Promise<WorkPhoto[]> {
    await this.workPhotos.reorder(business.id, body.ids)
    return this.workPhotos.listForBusiness(business.id)
  }

  @Patch('work-photos/:id')
  async updatePhoto(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: updateWorkPhotoSchema }) body: UpdateWorkPhotoInput,
  ): Promise<WorkPhoto[]> {
    await this.workPhotos.update(business.id, id, body)
    return this.workPhotos.listForBusiness(business.id)
  }

  @Delete('work-photos/:id')
  removePhoto(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkPhoto[]> {
    return this.uploads.removeWorkPhoto(business.id, id)
  }

  @Post('specialists/:id/photo')
  @UseInterceptors(imageUpload)
  setSpecialistPhoto(
    @CurrentBusiness() business: Business,
    @Param('id') id: string,
    @UploadedFile() file: UploadedImage | undefined,
  ): Promise<SpecialistPhotoUpload> {
    return this.uploads.setSpecialistPhoto(business, id, file)
  }

  @Delete('specialists/:id/photo')
  @HttpCode(204)
  removeSpecialistPhoto(
    @CurrentBusiness() business: Business,
    @Param('id') id: string,
  ): Promise<void> {
    return this.uploads.removeSpecialistPhoto(business, id)
  }
}
