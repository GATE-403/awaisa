import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/auth.module.js'
import { BookingsModule } from '../bookings/bookings.module.js'
import { BusinessesModule } from '../businesses/businesses.module.js'
import { MediaModule } from '../media/media.module.js'
import { NotificationsModule } from '../notifications/notifications.module.js'
import { TelegramModule } from '../telegram/telegram.module.js'
import { Review } from './review.entity.js'
import { ReviewsController } from './reviews.controller.js'
import { ReviewsService } from './reviews.service.js'

@Module({
  imports: [
    TypeOrmModule.forFeature([Review]),
    AuthModule,
    BookingsModule,
    BusinessesModule,
    MediaModule,
    NotificationsModule,
    TelegramModule,
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
