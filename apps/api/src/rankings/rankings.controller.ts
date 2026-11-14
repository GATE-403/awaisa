import { Controller, Get, Query } from '@nestjs/common'
import { z } from 'zod'
import { Cached } from '../cache/cached.decorator.js'
import { RankingsService } from './rankings.service.js'

const leaderboardSchema = z.object({
  kind: z.enum(['beauty', 'barber', 'nails', 'spa', 'health', 'other']).default('barber'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

type LeaderboardQuery = z.infer<typeof leaderboardSchema>

@Controller('rankings')
export class RankingsController {
  constructor(private readonly rankings: RankingsService) {}

  // The masters' leaderboard for `/top` (barbers unless a kind is asked for).
  @Cached({ ttl: 60, tags: ['catalog'], maxAge: 60 })
  @Get('masters')
  masters(@Query({ schema: leaderboardSchema }) query: LeaderboardQuery) {
    return this.rankings.leaderboard(query.kind, query.limit)
  }

  // The places' leaderboard (`/top?view=places`).
  @Cached({ ttl: 60, tags: ['catalog'], maxAge: 60 })
  @Get('places')
  places(@Query({ schema: leaderboardSchema }) query: LeaderboardQuery) {
    return this.rankings.placesLeaderboard(query.kind, query.limit)
  }
}
