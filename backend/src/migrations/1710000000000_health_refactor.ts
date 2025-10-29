import { MigrationInterface, QueryRunner } from "typeorm";

export class HealthRefactor1710000000000 implements MigrationInterface {
  name = 'HealthRefactor1710000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add denormalized frequency/bucket columns to dispensations
    await queryRunner.query(`ALTER TABLE dispensations ADD COLUMN IF NOT EXISTS frequency text`);
    await queryRunner.query(`ALTER TABLE dispensations ADD COLUMN IF NOT EXISTS "bucketStartAt" timestamptz`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_dispensation_bucket ON dispensations ("patientId","medicationId",frequency,"bucketStartAt")`);

    // Partial unique index to prevent duplicates for Daily/Monthly only
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE c.relname = 'uniq_dispensation_bucket_partial'
      ) THEN
        CREATE UNIQUE INDEX uniq_dispensation_bucket_partial
          ON dispensations ("patientId","medicationId",frequency,"bucketStartAt")
          WHERE frequency IN ('Daily','Monthly');
      END IF;
    END $$;`);

    // Attendance -> link to enrollment
    await queryRunner.query(`ALTER TABLE attendances ADD COLUMN IF NOT EXISTS "enrollmentId" uuid`);
    await queryRunner.query(`ALTER TABLE attendances ADD CONSTRAINT fk_attendance_enrollment FOREIGN KEY ("enrollmentId") REFERENCES patient_enrollments(id) ON DELETE SET NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_attendance_program_date ON attendances ("programId","attendanceDate")`);

    // Materialized progress fields on enrollments
    await queryRunner.query(`ALTER TABLE patient_enrollments
      ADD COLUMN IF NOT EXISTS "sessionsExpected" int DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "sessionsCompleted" int DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "sessionsMissed" int DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "attendanceRate" double precision DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "adherenceRate" double precision DEFAULT 0`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_enrollment_patient_program ON patient_enrollments ("patientId","programId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uniq_dispensation_bucket_partial`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_dispensation_bucket`);
    await queryRunner.query(`ALTER TABLE dispensations DROP COLUMN IF EXISTS "bucketStartAt"`);
    await queryRunner.query(`ALTER TABLE dispensations DROP COLUMN IF EXISTS frequency`);

    await queryRunner.query(`ALTER TABLE attendances DROP CONSTRAINT IF EXISTS fk_attendance_enrollment`);
    await queryRunner.query(`ALTER TABLE attendances DROP COLUMN IF EXISTS "enrollmentId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_attendance_program_date`);

    await queryRunner.query(`ALTER TABLE patient_enrollments DROP COLUMN IF EXISTS "sessionsExpected"`);
    await queryRunner.query(`ALTER TABLE patient_enrollments DROP COLUMN IF EXISTS "sessionsCompleted"`);
    await queryRunner.query(`ALTER TABLE patient_enrollments DROP COLUMN IF EXISTS "sessionsMissed"`);
    await queryRunner.query(`ALTER TABLE patient_enrollments DROP COLUMN IF EXISTS "attendanceRate"`);
    await queryRunner.query(`ALTER TABLE patient_enrollments DROP COLUMN IF EXISTS "adherenceRate"`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_enrollment_patient_program`);
  }
}
