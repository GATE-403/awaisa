import type { FeedLikes, FeedPage, UploadedPhoto } from '@awaisa/contracts'
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Business } from '../businesses/business.entity.js'
import { BusinessAccessGuard, CurrentBusiness } from '../businesses/business-access.guard.js'
import { Cached } from '../cache/cached.decorator.js'
import type { Specialist } from '../catalog/specialist.entity.js'
import { CurrentMaster, MasterGuard } from '../master/master.guard.js'
import { MediaUploadsService } from './media-uploads.service.js'
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
    private readonly workPhotos: WorkPhotosService,
    private readonly uploads: MediaUploadsService,
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

  /** A master adds a photo of a visit right after it: the service and master come from it. */
  @Post('master/:slug/photos')
  @UseGuards(MasterGuard)
  @UseInterceptors(imageUpload)
  addFromVisit(
    @CurrentBusiness() business: Business,
    @CurrentMaster() master: Specialist,
    @UploadedFile() file: { buffer: Buffer } | undefined,
    @Body() body: { bookingId?: string },
  ): Promise<UploadedPhoto> {
    return this.uploads.saveVisitPhoto(business, body?.bookingId, file, master.id)
  }

  /** The same from the cabinet: an owner or administrator snaps the visit they just marked. */
  @Post('manage/:slug/bookings/:bookingId/photo')
  @UseGuards(BusinessAccessGuard)
  @UseInterceptors(imageUpload)
  addFromCabinet(
    @CurrentBusiness() business: Business,
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @UploadedFile() file: { buffer: Buffer } | undefined,
  ): Promise<UploadedPhoto> {
    return this.uploads.saveVisitPhoto(business, bookingId, file, null)
  }
}
