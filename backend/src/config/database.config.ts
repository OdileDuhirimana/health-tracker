import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { join } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables for CLI
dotenv.config();

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const isDevelopment = this.configService.get<string>('NODE_ENV') === 'development';
    
    return {
      type: 'postgres',
      host: this.configService.get<string>('DB_HOST', 'localhost'),
      port: this.configService.get<number>('DB_PORT', 5432),
      username: this.configService.get<string>('DB_USERNAME', 'postgres'),
      password: this.configService.get<string>('DB_PASSWORD', 'postgres'),
      database: this.configService.get<string>('DB_DATABASE', 'healthtrackdb'),
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

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'healthtrackdb',
  entities: isDevelopment
    ? [join(__dirname, '..', '**', '*.entity.ts')]
    : [join(__dirname, '..', '**', '*.entity.js')],
  migrations: [join(__dirname, '..', 'migrations', '*.{ts,js}')],
  synchronize: false, // Never use synchronize in production
  logging: isDevelopment ? ['error', 'warn'] : false,
});
