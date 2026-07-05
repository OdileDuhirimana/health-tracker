import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Thin Redis-backed cache for expensive, read-heavy aggregate endpoints
 * (dashboard metrics, reports). Reuses the same `REDIS_URL` connection
 * pattern and degrade-gracefully philosophy as `RedisThrottlerStorage`
 * (`backend/src/common/throttler/`): if `REDIS_URL` isn't configured, every
 * `get()` reports a miss and every `set()`/`invalidateByPrefix()` is a no-op,
 * so the application behaves exactly as it did before caching existed
 * (always computing fresh) rather than failing to boot. If Redis *is*
 * configured but a call errors at runtime, the same fail-open policy
 * applies: a cache outage degrades to "slower" (recompute every time), not
 * "down."
 *
 * Invalidation strategy: coarse, prefix-based flush rather than precise
 * per-key invalidation. Dashboard/report data is derived from dispensations,
 * attendance, and enrollments — trying to compute exactly which cached keys
 * a given write could affect (which user's role-scoped view, which specific
 * aggregate) is real complexity for a marginal efficiency gain at this
 * application's scale. Flushing the whole `dashboard:`/`reports:` prefix on
 * any relevant write is simple to reason about and never serves stale data,
 * at the cost of a cache-cold read immediately after any write — an
 * acceptable tradeoff here.
 */
@Injectable()
export class RedisCacheService implements OnApplicationShutdown {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly client: Redis | null;

  constructor(configService: ConfigService) {
    const redisUrl = configService.get<string>('REDIS_URL');

    if (!redisUrl) {
      this.client = null;
      this.logger.warn(
        'REDIS_URL is not set. Dashboard/reports aggregate caching is disabled — every request ' +
          'recomputes from the database. Safe for correctness, just slower under load.',
      );
      return;
    }

    this.client = new Redis(redisUrl, { maxRetriesPerRequest: 1, lazyConnect: false });
    this.client.on('error', (err: Error) => {
      this.logger.error(`Redis cache connection error — caching will fail open (cache miss): ${err.message}`);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (err) {
      this.logger.error(`Cache read failed for key "${key}", treating as a miss: ${(err as Error).message}`);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.logger.error(`Cache write failed for key "${key}", continuing without caching it: ${(err as Error).message}`);
    }
  }

  /**
   * Deletes every key under a given prefix using non-blocking SCAN rather
   * than KEYS, which can stall a shared Redis instance under load with a
   * large keyspace.
   */
  async invalidateByPrefix(prefix: string): Promise<void> {
    if (!this.client) return;
    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } while (cursor !== '0');
    } catch (err) {
      this.logger.error(`Cache invalidation failed for prefix "${prefix}": ${(err as Error).message}`);
    }
  }

  onApplicationShutdown(): void {
    this.client?.disconnect();
  }
}
