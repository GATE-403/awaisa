import { randomUUID } from 'node:crypto'
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Business } from '../businesses/business.entity.js'
import {
  BusinessAccessGuard,
  CurrentBusiness,
  OwnerOnly,
} from '../businesses/business-access.guard.js'
import { Specialist } from '../catalog/specialist.entity.js'
import { type ImageKind, processImage } from './images.js'
import { StorageService } from './storage.service.js'
import { type UpdateWorkPhotoInput, updateWorkPhotoSchema } from './work-photos.schemas.js'
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
    @InjectRepository(Business) private readonly businesses: Repository<Business>,
    @InjectRepository(Specialist) private readonly specialists: Repository<Specialist>,
    private readonly storage: StorageService,
    private readonly workPhotos: WorkPhotosService,
  ) {}

  @Post('cover')
  @UseInterceptors(imageUpload)
  async setCover(
    @CurrentBusiness() business: Business,
    @UploadedFile() file: UploadedImage | undefined,
  ) {
    const url = await this.save(business, file, 'cover')
    if (business.coverUrl) await this.storage.remove(business.coverUrl)
    await this.businesses.update({ id: business.id }, { coverUrl: url })

    return { coverUrl: url }
  }

  @Delete('cover')
  @HttpCode(204)
  async removeCover(@CurrentBusiness() business: Business) {
    if (business.coverUrl) await this.storage.remove(business.coverUrl)
    await this.businesses.update({ id: business.id }, { coverUrl: null })
  }

  /** A photo of a work, optionally tagged with the service and master (multipart fields). */
  @Post('photos')
  @UseInterceptors(imageUpload)
  async addPhoto(
    @CurrentBusiness() business: Business,
    @UploadedFile() file: UploadedImage | undefined,
    @Body() body: { serviceId?: string; specialistId?: string },
  ) {
    await this.workPhotos.assertRoom(business.id)
    const url = await this.save(business, file, 'photo')
    await this.workPhotos.add(business.id, url, {
      serviceId: body?.serviceId || null,
      specialistId: body?.specialistId || null,
    })

    return this.workPhotos.listForBusiness(business.id)
  }

  @Get('work-photos')
  listPhotos(@CurrentBusiness() business: Business) {
    return this.workPhotos.listForBusiness(business.id)
  }

  @Patch('work-photos/:id')
  async updatePhoto(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: updateWorkPhotoSchema }) body: UpdateWorkPhotoInput,
  ) {
    await this.workPhotos.update(business.id, id, body)
    return this.workPhotos.listForBusiness(business.id)
  }

  @Delete('work-photos/:id')
  async removePhoto(@CurrentBusiness() business: Business, @Param('id', ParseUUIDPipe) id: string) {
    await this.storage.remove(await this.workPhotos.remove(business.id, id))
    return this.workPhotos.listForBusiness(business.id)
  }

  @Post('specialists/:id/photo')
  @UseInterceptors(imageUpload)
  async setSpecialistPhoto(
    @CurrentBusiness() business: Business,
    @Param('id') id: string,
    @UploadedFile() file: UploadedImage | undefined,
  ) {
    const specialist = await this.findSpecialist(business, id)
    const url = await this.save(business, file, 'avatar')
    if (specialist.photoUrl) await this.storage.remove(specialist.photoUrl)
    await this.specialists.update({ id }, { photoUrl: url })

    return { photoUrl: url }
  }

  @Delete('specialists/:id/photo')
  @HttpCode(204)
  async removeSpecialistPhoto(@CurrentBusiness() business: Business, @Param('id') id: string) {
    const specialist = await this.findSpecialist(business, id)
    if (specialist.photoUrl) await this.storage.remove(specialist.photoUrl)
    await this.specialists.update({ id }, { photoUrl: null })
  }

  private async save(business: Business, file: UploadedImage | undefined, kind: ImageKind) {
    if (!file) throw new BadRequestException('Выберите фото')

    return this.storage.put(
      `${business.id}/${randomUUID()}.webp`,
      await processImage(file.buffer, kind),
    )
  }

  private async findSpecialist(business: Business, id: string) {
    const specialist = await this.specialists.findOneBy({ id, businessId: business.id })
    if (!specialist) throw new NotFoundException('Мастер не найден')

    return specialist
  }
}
