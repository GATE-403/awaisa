import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { BookingsModule } from '../bookings/bookings.module.js'
import { WalletController } from './wallet.controller.js'
import { WalletService } from './wallet.service.js'

@Module({
  imports: [AuthModule, BookingsModule],
  controllers: [WalletController],
  providers: [WalletService],
})
export class WalletModule {}
