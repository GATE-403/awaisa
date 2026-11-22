import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { BookingsModule } from '../bookings/bookings.module.js'
import { NotificationsModule } from '../notifications/notifications.module.js'
import { FollowsController } from './follows.controller.js'
import { FollowsService } from './follows.service.js'

@Module({
  imports: [AuthModule, BookingsModule, NotificationsModule],
  controllers: [FollowsController],
  providers: [FollowsService],
  exports: [FollowsService],
})
export class FollowsModule {}
