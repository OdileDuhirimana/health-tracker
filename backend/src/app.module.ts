import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmConfigService } from './config/database.config';
import { RedisThrottlerStorage } from './common/throttler/redis-throttler-storage.service';
import { CacheModule } from './common/cache/cache.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProgramsModule } from './modules/programs/programs.module';
import { PatientsModule } from './modules/patients/patients.module';
import { MedicationsModule } from './modules/medications/medications.module';
import { DispensationsModule } from './modules/dispensations/dispensations.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { ActivityLogsModule } from './modules/activity-logs/activity-logs.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
    }),
    ScheduleModule.forRoot(),
    CacheModule,
    // Global rate limiting: a generous default for normal API usage, with a
    // much stricter named limit ('auth') applied explicitly to the login
    // endpoint (see AuthController) to blunt distributed brute-force /
    // credential-stuffing attempts without throttling legitimate traffic
    // elsewhere in the app.
    //
    // The default limit is set per-second (short TTL) rather than a large
    // count over a full minute: a single browser tab can legitimately fire
    // a burst of a dozen concurrent requests on page load (dashboard tiles,
    // list views, notification counts all loading in parallel), and the
    // automated e2e/integration suite does the same thing compressed into
    // a few seconds. A "100 requests/minute" bucket sounds generous until
    // an entire test run's traffic lands in the same 60-second window and
    // trips it. Capping burst rate per-second instead still blocks
    // sustained abuse (a scraper or credential-stuffing script making
    // hundreds of requests per second) without penalizing normal
    // page-load bursts or fast automated tests.
    // Built asynchronously (rather than ThrottlerModule.forRoot) so the
    // storage backend can be resolved from ConfigService: Redis-backed when
    // REDIS_URL is configured (required for correct enforcement across more
    // than one running instance), falling back to the default in-memory
    // store otherwise. See RedisThrottlerStorage's doc comment for the full
    // rationale.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: 1_000,
            limit: 30,
          },
          {
            name: 'auth',
            ttl: 60_000,
            limit: 5,
          },
        ],
        storage: new RedisThrottlerStorage(configService),
      }),
    }),
    AuthModule,
    UsersModule,
    ProgramsModule,
    PatientsModule,
    MedicationsModule,
    DispensationsModule,
    AttendanceModule,
    ActivityLogsModule,
    DashboardModule,
    ReportsModule,
    NotificationsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
