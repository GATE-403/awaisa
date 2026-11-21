import type { GeoPlace, GeoReverse } from '@awaisa/contracts'
import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { z } from 'zod'
import { AuthGuard } from '../auth/auth.guard.js'
import { Cached } from '../cache/cached.decorator.js'
import { GeoService } from './geo.service.js'

const searchSchema = z.object({ q: z.string().trim().min(3).max(120) })
const reverseSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
})

// Signed-in only (owners filling in a branch): the provider's fair use is not for the whole web.
// Answers are the same for everyone, so they are cached by address and by point.
@Controller('geo')
@UseGuards(AuthGuard)
export class GeoController {
  constructor(private readonly geo: GeoService) {}

  @Cached({ ttl: 86_400, tags: [] })
  @Get('search')
  search(
    @Query({ schema: searchSchema }) query: z.infer<typeof searchSchema>,
  ): Promise<GeoPlace[]> {
    return this.geo.search(query.q)
  }

  @Cached({ ttl: 86_400, tags: [] })
  @Get('reverse')
  async reverse(
    @Query({ schema: reverseSchema }) query: z.infer<typeof reverseSchema>,
  ): Promise<GeoReverse> {
    // Five decimals (~1 m) is all a pin needs, and it lets nearby points share the cache.
    const round = (value: number) => Math.round(value * 1e5) / 1e5
    return { place: await this.geo.reverse(round(query.lat), round(query.lng)) }
  }
}
