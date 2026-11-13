import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/auth.module.js'
import { Business } from '../businesses/business.entity.js'
import { BusinessesModule } from '../businesses/businesses.module.js'
import { Specialist } from '../catalog/specialist.entity.js'
import { MasterGuard } from '../master/master.guard.js'
import { FeedController } from './feed.controller.js'
import { ManageMediaController } from './manage-media.controller.js'
import { MediaController } from './media.controller.js'
import { StorageService } from './storage.service.js'
import { WorkPhotosService } from './work-photos.service.js'

@Module({
  imports: [TypeOrmModule.forFeature([Business, Specialist]), AuthModule, BusinessesModule],
  controllers: [MediaController, ManageMediaController, FeedController],
  providers: [StorageService, WorkPhotosService, MasterGuard],
})
export class MediaModule {}
