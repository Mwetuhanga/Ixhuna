import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Fixed-window rate limit kept in Redis, so the limit holds across every
 * app instance. Mobile networks often put many people behind one IP, so
 * the defaults are generous; they're there to stop floods, not people.
 */
@Injectable()
export class RateLimiterService implements OnModuleDestroy {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly redis = new Redis({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    // Fail fast instead of queueing while Redis is unreachable.
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
  });

  constructor() {
    this.redis.on('error', (err) => this.logger.warn(`Redis error: ${err.message}`));
  }

  /** Counts one hit for `key` and returns whether it is within `limit` per `windowSeconds`. */
  async allow(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const redisKey = `ratelimit:${key}`;
    try {
      // SET NX starts the window (with its expiry) only if none is open;
      // INCR keeps that expiry.
      const results = await this.redis
        .multi()
        .set(redisKey, 0, 'EX', windowSeconds, 'NX')
        .incr(redisKey)
        .exec();
      const [incrErr, count] = results?.[1] ?? [new Error('Rate limit transaction aborted'), 0];
      if (incrErr) throw incrErr;
      return (count as number) <= limit;
    } catch (err) {
      // Better to accept a complaint unthrottled than to turn people away
      // because Redis is briefly unreachable.
      this.logger.warn(`Rate limit check failed, allowing request: ${(err as Error).message}`);
      return true;
    }
  }

  async onModuleDestroy() {
    this.redis.disconnect();
  }
}
