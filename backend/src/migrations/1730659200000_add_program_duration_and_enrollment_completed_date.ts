import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProgramDurationAndEnrollmentCompletedDate1730659200000 implements MigrationInterface {
  name = 'AddProgramDurationAndEnrollmentCompletedDate1730659200000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add duration fields to programs table
    await queryRunner.query(`
      ALTER TABLE programs 
      ADD COLUMN IF NOT EXISTS duration INT,
      ADD COLUMN IF NOT EXISTS "durationUnit" VARCHAR(10),
      ADD COLUMN IF NOT EXISTS "durationInDays" INT DEFAULT 90
    `);

    // Backfill existing programs with default 90 days if durationInDays is null or 30
    await queryRunner.query(`
      UPDATE programs 
      SET "durationInDays" = 90 
      WHERE "durationInDays" IS NULL OR "durationInDays" = 30
    `);

    // Add completedDate to patient_enrollments table
    await queryRunner.query(`
      ALTER TABLE patient_enrollments 
      ADD COLUMN IF NOT EXISTS "completedDate" DATE
    `);

    // Backfill completedDate based on enrollmentDate + program.durationInDays
    await queryRunner.query(`
      UPDATE patient_enrollments pe
      SET "completedDate" = pe."enrollmentDate" + (p."durationInDays" || ' days')::INTERVAL
      FROM programs p
      WHERE pe."programId" = p.id 
        AND pe."completedDate" IS NULL
        AND p."durationInDays" IS NOT NULL
    `);

    // Create index for better query performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_enrollment_completed_date 
      ON patient_enrollments("completedDate")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove index
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_enrollment_completed_date
    `);

    // Remove completedDate column
    await queryRunner.query(`
      ALTER TABLE patient_enrollments 
      DROP COLUMN IF EXISTS "completedDate"
    `);

    // Remove duration fields from programs
    await queryRunner.query(`
      ALTER TABLE programs 
      DROP COLUMN IF EXISTS "durationUnit",
      DROP COLUMN IF EXISTS duration
    `);
  }
}
