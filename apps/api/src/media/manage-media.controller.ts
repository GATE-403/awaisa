import { randomUUID } from 'node:crypto'
import {
  BadRequestException,
  Controller,
  Delete,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Query,
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

type UploadedImage = { buffer: Buffer; mimetype: string }

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
const MAX_PHOTOS = 6

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

  @Post('photos')
  @UseInterceptors(imageUpload)
  async addPhoto(
    @CurrentBusiness() business: Business,
    @UploadedFile() file: UploadedImage | undefined,
  ) {
    if (business.photos.length >= MAX_PHOTOS) {
      throw new BadRequestException(`Можно до ${MAX_PHOTOS} фото — удалите одно`)
    }
    const url = await this.save(business, file, 'photo')
    const photos = [...business.photos, url]
    await this.businesses.update({ id: business.id }, { photos })

    return { photos }
  }

  @Delete('photos')
  async removePhoto(@CurrentBusiness() business: Business, @Query('url') url: string) {
    if (!business.photos.includes(url)) throw new NotFoundException('Фото не найдено')
    const photos = business.photos.filter((photo) => photo !== url)
    await this.businesses.update({ id: business.id }, { photos })
    await this.storage.remove(url)

    return { photos }
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
