import { Controller, Get, Header, Param, StreamableFile } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { StorageService } from './storage.service.js'

// Serves photos stored on disk (STORAGE_DRIVER=local). With S3/R2 the URLs point at the bucket instead.
@Controller('media')
@SkipThrottle()
export class MediaController {
  constructor(private readonly storage: StorageService) {}

  @Get(':folder/:file')
  @Header('Content-Type', 'image/webp')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  async get(@Param('folder') folder: string, @Param('file') file: string) {
    return new StreamableFile(await this.storage.readLocal(`${folder}/${file}`))
  }
}
