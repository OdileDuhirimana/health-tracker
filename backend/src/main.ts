import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
const compression = require('compression');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable gzip compression for better performance
  app.use(compression());
  
  // Enable CORS(It is allowing requests from any port for now)
  app.enableCors({ origin: true, credentials: true });

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

  // Swagger Documentation Setup
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

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger Documentation available at: http://localhost:${port}/api`);
}
bootstrap();

