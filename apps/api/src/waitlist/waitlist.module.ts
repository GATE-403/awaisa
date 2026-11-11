import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/auth.module.js'
import { BookingsModule } from '../bookings/bookings.module.js'
import { BusinessesModule } from '../businesses/businesses.module.js'
import { CatalogModule } from '../catalog/catalog.module.js'
import { Service } from '../catalog/service.entity.js'
import { Specialist } from '../catalog/specialist.entity.js'
import { NotificationsModule } from '../notifications/notifications.module.js'
import { WaitlistController } from './waitlist.controller.js'
import { WaitlistService } from './waitlist.service.js'
import { WaitlistEntry } from './waitlist-entry.entity.js'

@Module({
  imports: [
    TypeOrmModule.forFeature([WaitlistEntry, Service, Specialist]),
    AuthModule,
    BookingsModule,
    BusinessesModule,
    CatalogModule,
    NotificationsModule,
  ],
  controllers: [WaitlistController],
  providers: [WaitlistService],
})
export class WaitlistModule {}
