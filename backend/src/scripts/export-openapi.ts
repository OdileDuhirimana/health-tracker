import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { AppModule } from '../app.module';

/**
 * Generates a version-pinned, downloadable OpenAPI spec file
 * (`backend/openapi.json`) from the same `DocumentBuilder` config used by the
 * live Swagger UI in `main.ts`.
 *
 * Why this exists as a separate script rather than just pointing consumers
 * at the live `/api-json` endpoint: a checked-in, versioned spec file can be
 * diffed in a PR (so an accidental breaking API change is visible in code
 * review), consumed by client-generation tooling in CI without needing a
 * running server, and archived per-release. The live Swagger UI remains the
 * right tool for interactive exploration; this is for automation.
 *
 * Usage: `npm run openapi:export` (see package.json). Does not start an HTTP
 * listener — creates the Nest application context only long enough to build
 * the document, then exits.
 */
async function exportOpenApiSpec(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });

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
  const outputPath = join(__dirname, '..', '..', 'openapi.json');
  writeFileSync(outputPath, JSON.stringify(document, null, 2));

   
  console.log(`OpenAPI spec written to ${outputPath}`);

  await app.close();
}

exportOpenApiSpec().catch((error) => {
   
  console.error('Failed to export OpenAPI spec:', error);
  process.exitCode = 1;
});
