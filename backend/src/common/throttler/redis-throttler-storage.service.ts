import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import Redis from 'ioredis';

/**
 * Atomically increments the hit counter for a (key, throttlerName) pair and
 * evaluates the block state, replicating the semantics of @nestjs/throttler's
 * built-in in-memory `ThrottlerStorageService` (see its `increment` method)
 * but safe to share across multiple concurrently-running application
 * instances. Running entirely as a single Lua script means the read-check-
 * write sequence (increment hits, compare to limit, maybe set a block) is
 * atomic from Redis's point of view — two instances racing on the same key
 * cannot both "win" a boundary check the way two independent in-memory
 * counters could.
 *
 * KEYS[1] = hits key, KEYS[2] = block key
 * ARGV[1] = ttl (ms), ARGV[2] = limit, ARGV[3] = blockDuration (ms)
 * Returns: [totalHits, timeToExpire (s), isBlocked (0|1), timeToBlockExpire (s)]
 */
const INCREMENT_SCRIPT = `
local hitsKey = KEYS[1]
local blockKey = KEYS[2]
local ttl = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local blockDuration = tonumber(ARGV[3])

local blockPttl = redis.call('PTTL', blockKey)
if blockPttl and blockPttl > 0 then
  local currentHits = tonumber(redis.call('GET', hitsKey) or '0')
  return { currentHits, 0, 1, math.ceil(blockPttl / 1000) }
end

local totalHits = redis.call('INCR', hitsKey)
if totalHits == 1 then
  redis.call('PEXPIRE', hitsKey, ttl)
end
local hitsPttl = redis.call('PTTL', hitsKey)
if hitsPttl < 0 then
  redis.call('PEXPIRE', hitsKey, ttl)
  hitsPttl = ttl
end

local isBlocked = 0
local timeToBlockExpire = 0
if totalHits > limit then
  redis.call('SET', blockKey, '1', 'PX', blockDuration)
  isBlocked = 1
  timeToBlockExpire = math.ceil(blockDuration / 1000)
end

return { totalHits, math.ceil(hitsPttl / 1000), isBlocked, timeToBlockExpire }
`;

/**
 * Redis-backed rate-limit storage for `@nestjs/throttler`.
 *
 * Why this exists: the default `ThrottlerStorageService` @nestjs/throttler
 * ships with keeps counters in an in-process `Map`. That's invisible once
 * this API runs behind a load balancer with more than one instance (the
 * common shape of any real deployment, and something Render's autoscaling
 * or a simple manual scale-out would introduce without any application code
 * change): each instance enforces its own independent limit, so N instances
 * multiply the effective ceiling by N, and a client can trivially bypass the
 * "5 login attempts per minute" auth throttle by being round-robined across
 * instances. This was flagged as an undisclosed scalability/security gap in
 * the prior code review. Backing the counters with Redis makes the limit
 * global across every instance sharing that Redis, which is what the limit
 * is actually supposed to mean.
 *
 * Degradation behavior: if `REDIS_URL` isn't configured at all (local dev,
 * unit tests, and any environment that hasn't provisioned Redis), this falls
 * back to composing the stock in-memory `ThrottlerStorageService` — rate
 * limiting still works for a single instance, it just isn't shared. If
 * `REDIS_URL` *is* configured but the connection fails at runtime (network
 * blip, Redis restart), requests are allowed through rather than the whole
 * API returning 500s for every request — logged loudly so it's visible in
 * monitoring, but availability wins over strict enforcement of a
 * defense-in-depth control that isn't the primary authorization boundary.
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage, OnApplicationShutdown {
  private readonly logger = new Logger(RedisThrottlerStorage.name);
  private readonly client: Redis | null;
  private readonly memoryFallback = new ThrottlerStorageService();

  constructor(configService: ConfigService) {
    const redisUrl = configService.get<string>('REDIS_URL');

    if (!redisUrl) {
      this.client = null;
      this.logger.warn(
        'REDIS_URL is not set. Rate limiting will fall back to per-instance in-memory storage. ' +
          'This is expected in local development/CI, but a multi-instance production deployment ' +
          'MUST set REDIS_URL for rate limits to be enforced globally rather than per-instance.',
      );
      return;
    }

    this.client = new Redis(redisUrl, {
      // Fail fast on a single request rather than queuing/retrying commands
      // indefinitely while Redis is unreachable, which would otherwise stall
      // every incoming HTTP request behind the ThrottlerGuard.
      maxRetriesPerRequest: 1,
      lazyConnect: false,
    });
    this.client.on('error', (err: Error) => {
      this.logger.error(`Redis connection error — rate limiting will fail open: ${err.message}`);
    });
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    if (!this.client) {
      return this.memoryFallback.increment(key, ttl, limit, blockDuration, throttlerName);
    }

    const namespacedKey = `throttle:${throttlerName}:${key}`;
    try {
      const result = (await this.client.eval(
        INCREMENT_SCRIPT,
        2,
        `${namespacedKey}:hits`,
        `${namespacedKey}:blocked`,
        ttl,
        limit,
        blockDuration,
      )) as [number, number, number, number];

      const [totalHits, timeToExpire, isBlocked, timeToBlockExpire] = result;
      return {
        totalHits,
        timeToExpire,
        isBlocked: isBlocked === 1,
        timeToBlockExpire,
      };
    } catch (err) {
      // Fail open: a transient Redis outage should degrade rate-limit
      // enforcement, not take the whole API down with it.
      this.logger.error(
        `Redis rate-limit increment failed, allowing request through: ${(err as Error).message}`,
      );
      return { totalHits: 1, timeToExpire: Math.ceil(ttl / 1000), isBlocked: false, timeToBlockExpire: 0 };
    }
  }

  onApplicationShutdown(): void {
    this.memoryFallback.onApplicationShutdown();
    this.client?.disconnect();
  }
}
