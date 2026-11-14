import { Global, Module } from '@nestjs/common'
import { RankingsController } from './rankings.controller.js'
import { RankingsService } from './rankings.service.js'

@Global()
@Module({
  controllers: [RankingsController],
  providers: [RankingsService],
  exports: [RankingsService],
})
export class RankingsModule {}
