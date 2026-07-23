import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { SkipThrottle } from '@nestjs/throttler';
import { DataSource } from 'typeorm';

/**
 * Health check endpoint used by Docker HEALTHCHECK and the Render
 * `healthCheckPath` deployment gate (see backend/Dockerfile, render.yaml).
 *
 * Why a real DB ping: this app has no meaningful functionality without
 * PostgreSQL. A health check that always returns `ok` regardless of
 * database state would let an orchestrator keep routing traffic to an
 * instance that can't serve any real request — the single most common
 * failure mode for this service. Running `SELECT 1` is a cheap,
 * side-effect-free way to prove the connection pool is actually usable,
 * not just that the process is alive.
 */
// Render's own infra polls this route directly to decide whether to route
// traffic to this instance at all. Throttling it risks a feedback loop:
// a failing check triggers more frequent retries from the platform, which
// then get rate-limited too, compounding rather than recovering.
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getHealth() {
    const timestamp = new Date().toISOString();

    try {
      await this.dataSource.query('SELECT 1');
    } catch (error) {
      throw new ServiceUnavailableException({
        status: 'error',
        timestamp,
        database: 'unreachable',
      });
    }

    return {
      status: 'ok',
      timestamp,
      database: 'connected',
    };
  }
}
