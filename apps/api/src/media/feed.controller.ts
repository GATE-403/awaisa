import { randomUUID } from 'node:crypto'
import type { FeedLikes, FeedPage, UploadedPhoto } from '@awaisa/contracts'
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import type { Business } from '../businesses/business.entity.js'
import { CurrentBusiness } from '../businesses/business-access.guard.js'
import { Cached } from '../cache/cached.decorator.js'
import type { Specialist } from '../catalog/specialist.entity.js'
import { CurrentMaster, MasterGuard } from '../master/master.guard.js'
import { processImage } from './images.js'
import { StorageService } from './storage.service.js'
import {
  type FeedQuery,
  feedQuerySchema,
  type LikeInput,
  likeSchema,
} from './work-photos.schemas.js'
import { WorkPhotosService } from './work-photos.service.js'

const imageUpload = FileInterceptor('file', {
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, accept) => accept(null, file.mimetype.startsWith('image/')),
})

@Controller()
export class FeedController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly workPhotos: WorkPhotosService,
    private readonly storage: StorageService,
  ) {}

  /** «Работы»: a vertical feed of finished work, each photo one tap from booking it. */
  @Cached({ ttl: 60, tags: ['catalog'], maxAge: 30 })
  @Get('feed')
  feed(@Query({ schema: feedQuerySchema }) query: FeedQuery): Promise<FeedPage> {
    return this.workPhotos.feed(query)
  }

  @Post('feed/:id/like')
  like(
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: likeSchema }) body: LikeInput,
  ): Promise<FeedLikes> {
    return this.workPhotos.like(id, body.session, true)
  }

  @Post('feed/:id/unlike')
  unlike(
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: likeSchema }) body: LikeInput,
  ): Promise<FeedLikes> {
    return this.workPhotos.like(id, body.session, false)
  }

  @Post('feed/:id/report')
  @HttpCode(204)
  report(@Param('id', ParseUUIDPipe) id: string) {
    return this.workPhotos.report(id)
  }

  /** A master adds a photo of a visit right after it: the service and master come from it. */
  @Post('master/:slug/photos')
  @UseGuards(MasterGuard)
  @UseInterceptors(imageUpload)
  async addFromVisit(
    @CurrentBusiness() business: Business,
    @CurrentMaster() master: Specialist,
    @UploadedFile() file: { buffer: Buffer } | undefined,
    @Body() body: { bookingId?: string },
  ): Promise<UploadedPhoto> {
    if (!file) throw new BadRequestException('Выберите фото')
    const [booking] = (await this.dataSource.query(
      `SELECT "service_id" AS "serviceId", "specialist_id" AS "specialistId" FROM "bookings"
       WHERE "id" = $1 AND "business_id" = $2`,
      [body?.bookingId ?? null, business.id],
    )) as { serviceId: string; specialistId: string }[]
    if (!booking) throw new BadRequestException('Визит не найден')
    if (booking.specialistId !== master.id)
      throw new ForbiddenException('Это визит другого мастера')
    await this.workPhotos.assertRoom(business.id)
    const url = await this.storage.put(
      `${business.id}/${randomUUID()}.webp`,
      await processImage(file.buffer, 'photo'),
    )
    await this.workPhotos.add(business.id, url, {
      serviceId: booking.serviceId,
      specialistId: master.id,
      bookingId: body.bookingId,
    })
    return { url }
  }
}
