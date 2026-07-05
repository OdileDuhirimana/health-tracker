import { Global, Module } from '@nestjs/common';
import { RedisCacheService } from './redis-cache.service';

/**
 * Global so any feature module can inject `RedisCacheService` without
 * re-declaring it in every module's `imports`/`providers` — it's
 * infrastructure (like `ConfigModule`), not a feature-scoped dependency.
 */
@Global()
@Module({
  providers: [RedisCacheService],
  exports: [RedisCacheService],
})
export class CacheModule {}
