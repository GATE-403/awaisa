import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request, Response } from 'express'
import { from, map, mergeMap, type Observable, of, switchMap } from 'rxjs'
import { CacheService, type CacheTag } from './cache.service.js'
import { CACHED, type CachedOptions } from './cached.decorator.js'

// Changes that make the public catalog stale (an owner's edit, a new business, a review, a
// reported or added work photo, a moderator's decision); any other write may change free time.
const CATALOG_WRITES = [
  /^\/manage\//,
  /^\/businesses\/?$/,
  /^\/bookings\/[^/]+\/review$/,
  /^\/feed\/[^/]+\/report$/,
  /^\/reports$/,
  /^\/moderation\//,
  /^\/master\/[^/]+\/photos$/,
]

const tagsForWrite = (path: string): CacheTag[] =>
  CATALOG_WRITES.some((pattern) => pattern.test(path))
    ? ['catalog', 'availability']
    : ['availability']

// Serves @Cached GETs from the cache, and after every successful write bumps the tags it touches.
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly cache: CacheService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle()
    const http = context.switchToHttp()
    const request = http.getRequest<Request>()
    const response = http.getResponse<Response>()

    if (request.method !== 'GET') {
      if (request.path.startsWith('/auth/')) return next.handle()
      // The answer leaves only after the bump: the client's very next read must not get the old
      // cached copy (a booking, then its free time).
      return next
        .handle()
        .pipe(
          mergeMap((value) =>
            from(this.cache.bump(tagsForWrite(request.path))).pipe(map(() => value)),
          ),
        )
    }

    const options = this.reflector.get<CachedOptions | undefined>(CACHED, context.getHandler())
    if (!options) return next.handle()
    if (options.maxAge) {
      // Lets the phone's browser reuse an answer for a few seconds (back/forward, re-renders).
      response.setHeader(
        'Cache-Control',
        `public, max-age=${options.maxAge}, stale-while-revalidate=${options.maxAge * 4}`,
      )
    }
    return from(
      this.cache.remember(
        `http:${request.originalUrl}`,
        options.ttl,
        options.tags,
        () =>
          new Promise<unknown>((resolve, reject) => {
            next.handle().subscribe({ next: resolve, error: reject })
          }),
      ),
    ).pipe(switchMap((value) => of(value)))
  }
}
