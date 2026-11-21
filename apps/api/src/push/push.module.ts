import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/auth.module.js'
import { PushController } from './push.controller.js'
import { PushService } from './push.service.js'
import { PushSubscription } from './push-subscription.entity.js'

@Module({
  imports: [TypeOrmModule.forFeature([PushSubscription]), AuthModule],
  controllers: [PushController],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
