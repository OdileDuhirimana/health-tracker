import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { User, UserRole, UserStatus } from '../entities/user.entity';
import { Program, ProgramType, ProgramStatus, SessionFrequency } from '../entities/program.entity';
import { Medication, MedicationFrequency, MedicationStatus } from '../entities/medication.entity';
import { Patient, Gender, PatientStatus } from '../entities/patient.entity';
import { PatientEnrollment } from '../entities/patient-enrollment.entity';
import { Dispensation } from '../entities/dispensation.entity';
import { Attendance } from '../entities/attendance.entity';
import { ActivityLog } from '../entities/activity-log.entity';
import { Notification } from '../entities/notification.entity';

/**
 * Minimal fixture seed for CI's e2e job.
 *
 * Why this exists instead of reusing `npm run seed` (seeds/run-seed.ts ->
 * seed.ts): that script deliberately generates a realistic-scale dataset —
 * ~150 users, 120 patients, 6 months of daily/monthly dispensation history
 * (100k+ rows) — which is the right choice for local development/demo
 * purposes but takes several minutes to run. Paying that cost on every CI
 * run for every push/PR would make the pipeline slow enough that people
 * stop trusting or waiting for it, which defeats the point of having CI at
 * all. This script creates only the specific accounts the e2e suite
 * (test/e2e/backend-api.e2e-spec.ts) hardcodes — admin2@/staff2@/guest1@ —
 * plus the minimum one-of-each-entity fixture data needed to exercise every
 * endpoint the suite calls, and nothing else.
 *
 * This intentionally does not touch, consolidate, or replace the other
 * seed scripts (seed.ts, simple-seed.ts, run-seed.ts, reset-and-seed.ts) —
 * that consolidation is tracked separately as a known maintainability
 * item and out of scope here.
 */
async function seedForCi() {
  const configService = new ConfigService({
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
    DB_USERNAME: process.env.DB_USERNAME || 'postgres',
    DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
    DB_DATABASE: process.env.DB_DATABASE || 'healthtrackdb',
  });

  const dataSource = new DataSource({
    type: 'postgres',
    host: configService.get<string>('DB_HOST'),
    port: configService.get<number>('DB_PORT'),
    username: configService.get<string>('DB_USERNAME'),
    password: configService.get<string>('DB_PASSWORD'),
    database: configService.get<string>('DB_DATABASE'),
    entities: [
      User,
      Program,
      Medication,
      Patient,
      PatientEnrollment,
      Dispensation,
      Attendance,
      ActivityLog,
      Notification,
    ],
    synchronize: true,
  });

  try {
    await dataSource.initialize();
    console.log('Connected to database for CI fixture seed');

    const userRepo = dataSource.getRepository(User);
    const programRepo = dataSource.getRepository(Program);
    const medicationRepo = dataSource.getRepository(Medication);
    const patientRepo = dataSource.getRepository(Patient);

    const passwordHash = await bcrypt.hash('password123', 10);

    // Two admin accounts because the e2e suite specifically logs in as
    // "admin2@..." (see backend-api.e2e-spec.ts) — matching seed.ts's
    // i+1 numbering convention keeps the two scripts' credentials
    // interchangeable if a future test run seeds with either one.
    for (let i = 1; i <= 2; i++) {
      await userRepo.save(
        userRepo.create({
          name: `CI Admin ${i}`,
          email: `admin${i}@healthtrack.app`,
          password: passwordHash,
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
        }),
      );
    }

    for (let i = 1; i <= 2; i++) {
      await userRepo.save(
        userRepo.create({
          name: `CI Staff ${i}`,
          email: `staff${i}@healthtrack.app`,
          password: passwordHash,
          role: UserRole.HEALTHCARE_STAFF,
          status: UserStatus.ACTIVE,
        }),
      );
    }

    await userRepo.save(
      userRepo.create({
        name: 'CI Guest 1',
        email: 'guest1@healthtrack.app',
        password: passwordHash,
        role: UserRole.GUEST,
        status: UserStatus.ACTIVE,
      }),
    );

    await medicationRepo.save(
      medicationRepo.create({
        medicationId: 'M-001',
        name: 'Amoxicillin',
        dosage: '500mg',
        frequency: MedicationFrequency.DAILY,
        status: MedicationStatus.ACTIVE,
      }),
    );

    await programRepo.save(
      programRepo.create({
        name: 'CI Fixture Program',
        type: ProgramType.OTHER,
        status: ProgramStatus.ACTIVE,
        sessionFrequency: SessionFrequency.WEEKLY,
        durationInDays: 90,
      }),
    );

    await patientRepo.save(
      patientRepo.create({
        patientId: 'P-1001',
        fullName: 'CI Fixture Patient',
        dateOfBirth: new Date('1990-01-01'),
        gender: Gender.OTHER,
        status: PatientStatus.ACTIVE,
      }),
    );

    console.log('CI fixture seed completed successfully');
    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('CI fixture seed failed:', error);
    await dataSource.destroy().catch(() => undefined);
    process.exit(1);
  }
}

seedForCi();
