import { Controller, Get, Query } from '@nestjs/common'
import { z } from 'zod'
import { Cached } from '../cache/cached.decorator.js'
import { SearchService } from './search.service.js'

const resolveQuerySchema = z.object({ q: z.string().trim().min(1).max(80) })

@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  /** What a query was read as — «Показаны результаты для «стрижка»» on the catalog. */
  @Cached({ ttl: 60, tags: ['catalog'], maxAge: 30 })
  @Get('resolve')
  async resolve(@Query({ schema: resolveQuerySchema }) query: z.infer<typeof resolveQuerySchema>) {
    const resolved = await this.search.resolve(query.q)
    return { query: query.q, corrected: resolved?.corrected ?? null }
  }
}
