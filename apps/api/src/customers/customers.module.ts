import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/auth.module.js'
import { BookingsModule } from '../bookings/bookings.module.js'
import { BusinessesModule } from '../businesses/businesses.module.js'
import { LoyaltyModule } from '../loyalty/loyalty.module.js'
import { MediaModule } from '../media/media.module.js'
import { WaitlistModule } from '../waitlist/waitlist.module.js'
import { AccountService } from './account.service.js'
import { Customer } from './customer.entity.js'
import { CustomersService } from './customers.service.js'
import { MeController } from './me.controller.js'
import { SessionController } from './session.controller.js'

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer]),
    AuthModule,
    BookingsModule,
    BusinessesModule,
    LoyaltyModule,
    MediaModule,
    WaitlistModule,
  ],
  controllers: [MeController, SessionController],
  providers: [AccountService, CustomersService],
})
export class CustomersModule {}
