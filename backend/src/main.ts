// Must be the first import in the application's entry point — see
// instrument.ts's doc comment for why.
import './instrument';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import compression from 'compression';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  // Render (and most PaaS hosts) terminates TLS and proxies every request
  // through an internal load balancer. Without this, Express resolves
  // req.ip to that proxy's address for every request rather than the real
  // client from X-Forwarded-For — collapsing the throttler's per-IP quota
  // into one shared bucket for all traffic, including the platform's own
  // health-check probe.
  app.set('trust proxy', 1);

  // Standardize every error response shape and stop unexpected exceptions
  // (e.g. raw TypeORM driver errors) from leaking internal detail.
  app.useGlobalFilters(new AllExceptionsFilter());

  // Enable gzip compression for better performance
  app.use(compression());

  const corsOrigins = (
    process.env.CORS_ORIGIN ||
    process.env.FRONTEND_URL ||
    'http://localhost:3000,http://127.0.0.1:3000'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
    credentials: true,
  });

  // Global validation pipe with better error formatting
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => {
          return Object.values(error.constraints || {}).join(', ');
        });
        return new BadRequestException(messages.join(', '));
      },
      }),
  );

  const isProduction = (process.env.NODE_ENV || '').toLowerCase() === 'production';
  const enableSwagger = process.env.ENABLE_SWAGGER === 'true' || !isProduction;

  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('HealthTrack API')
      .setDescription('Comprehensive API documentation for Health Program & Medicine Tracker System')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
        },
        'JWT-auth',
      )
      .addTag('Authentication', 'User authentication and authorization endpoints')
      .addTag('Users', 'User management endpoints (Admin only)')
      .addTag('Programs', 'Health program management endpoints')
      .addTag('Patients', 'Patient management and enrollment endpoints')
      .addTag('Medications', 'Medication catalog management endpoints')
      .addTag('Dispensations', 'Medication dispensation tracking with duplicate prevention')
      .addTag('Attendance', 'Patient attendance tracking endpoints')
      .addTag('Activity Logs', 'System activity log endpoints')
      .addTag('Dashboard', 'Dashboard metrics and statistics')
      .addTag('Reports', 'Report generation endpoints (Admin only)')
      .addTag('Notifications', 'Notification management endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document, {
      customSiteTitle: 'HealthTrack API Documentation',
      customfavIcon: '/favicon.ico',
      customCss: '.swagger-ui .topbar { display: none }',
    });
  }

  const port = process.env.PORT || 3001;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
  const protocol = process.env.APP_PROTOCOL || 'http';
  const publicHost = process.env.APP_HOST || host;

  console.log(`Application is running on: ${protocol}://${publicHost}:${port}`);
  if (enableSwagger) {
    console.log(`Swagger documentation available at: ${protocol}://${publicHost}:${port}/api`);
  }
}
bootstrap();
