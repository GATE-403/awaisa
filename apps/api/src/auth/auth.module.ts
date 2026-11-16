import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Customer } from '../customers/customer.entity.js'
import { NotificationsModule } from '../notifications/notifications.module.js'
import { AuthController } from './auth.controller.js'
import { AuthGuard, OptionalAuthGuard } from './auth.guard.js'
import { AuthService } from './auth.service.js'
import { OtpCode } from './otp-code.entity.js'
import { Session } from './session.entity.js'
import { TelegramLogin } from './telegram-login.entity.js'
import { TelegramLoginService } from './telegram-login.service.js'

@Module({
  imports: [
    TypeOrmModule.forFeature([OtpCode, Session, Customer, TelegramLogin]),
    NotificationsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, OptionalAuthGuard, TelegramLoginService],
  exports: [AuthService, AuthGuard, OptionalAuthGuard, TelegramLoginService],
})
export class AuthModule {}
