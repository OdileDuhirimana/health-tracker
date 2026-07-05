import { Injectable, Logger } from '@nestjs/common';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { join } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables for CLI
dotenv.config();

const logger = new Logger('DatabaseConfig');

/**
 * Resolves the `rejectUnauthorized` posture for the TLS connection to
 * Postgres when SSL is enabled.
 *
 * Historically this defaulted to `false` unconditionally, meaning a
 * production deploy that enabled `DB_SSL` but forgot to also set
 * `DB_SSL_REJECT_UNAUTHORIZED=true` would silently accept any TLS
 * certificate presented by the server it connected to — weakening
 * protection against MITM interception of database traffic. Managed
 * Postgres providers (Render, Supabase, RDS) present valid, publicly
 * trusted certificates, so verification should be the safe default in
 * production; the only legitimate reason to disable it is connecting to a
 * self-signed cert in a constrained environment, which is why an explicit
 * opt-out is still supported — but it now requires deliberately setting the
 * env var to `'false'`, and does so loudly rather than silently.
 */
function resolveSslRejectUnauthorized(isDevelopment: boolean, raw: string | undefined): boolean {
  if (raw !== undefined) {
    const rejectUnauthorized = raw === 'true';
    if (!rejectUnauthorized && !isDevelopment) {
      logger.warn(
        'DB_SSL_REJECT_UNAUTHORIZED is explicitly set to a non-"true" value in a non-development ' +
          'environment. TLS certificate verification for the database connection is DISABLED. This ' +
          'accepts any certificate the database server presents and should only be used intentionally ' +
          '(e.g. a self-signed cert in a constrained environment) — never as an unexamined default.',
      );
    }
    return rejectUnauthorized;
  }
  // No explicit opt-out was provided: default to secure verification outside
  // of local development, where developers commonly point at a Dockerized
  // Postgres without a trusted certificate at all.
  return !isDevelopment;
}

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const isDevelopment = this.configService.get<string>('NODE_ENV') === 'development';
    const databaseUrl = this.configService.get<string>('DATABASE_URL');
    const useSsl = this.configService.get<string>('DB_SSL', isDevelopment ? 'false' : 'true') === 'true';
    const rejectUnauthorized = resolveSslRejectUnauthorized(
      isDevelopment,
      this.configService.get<string>('DB_SSL_REJECT_UNAUTHORIZED'),
    );

    return {
      type: 'postgres',
      ...(databaseUrl
        ? { url: databaseUrl }
        : {
            host: this.configService.get<string>('DB_HOST', 'localhost'),
            port: this.configService.get<number>('DB_PORT', 5432),
            username: this.configService.get<string>('DB_USERNAME', 'postgres'),
            password: this.configService.get<string>('DB_PASSWORD', 'postgres'),
            database: this.configService.get<string>('DB_DATABASE', 'healthtrackdb'),
          }),
      ssl: useSsl ? { rejectUnauthorized } : false,
      extra: {
        max: parseInt(this.configService.get<string>('DB_POOL_MAX', '3'), 10),
      },
      // Use autoLoadEntities - this will automatically load entities from forFeature() calls
      autoLoadEntities: true,
      // Also provide explicit paths as fallback
      entities: isDevelopment
        ? [join(__dirname, '..', '**', '*.entity.ts')]
        : [join(__dirname, '..', '**', '*.entity.js')],
      migrations: [join(__dirname, '..', 'migrations', '*.{ts,js}')],
      synchronize: isDevelopment,
      logging: isDevelopment ? ['error', 'warn'] : false,
    };
  }
}

// DataSource for TypeORM CLI (migrations)
const isDevelopment = process.env.NODE_ENV === 'development';
const useSsl = (process.env.DB_SSL || (isDevelopment ? 'false' : 'true')) === 'true';
const cliRejectUnauthorized = resolveSslRejectUnauthorized(
  isDevelopment,
  process.env.DB_SSL_REJECT_UNAUTHORIZED,
);

export default new DataSource({
  type: 'postgres',
  ...(process.env.DATABASE_URL
    ? { url: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_DATABASE || 'healthtrackdb',
      }),
  ssl: useSsl ? { rejectUnauthorized: cliRejectUnauthorized } : false,
  extra: {
    max: parseInt(process.env.DB_POOL_MAX || '3', 10),
  },
  entities: isDevelopment
    ? [join(__dirname, '..', '**', '*.entity.ts')]
    : [join(__dirname, '..', '**', '*.entity.js')],
  migrations: [join(__dirname, '..', 'migrations', '*.{ts,js}')],
  synchronize: false, // Never use synchronize in production
  logging: isDevelopment ? ['error', 'warn'] : false,
});
