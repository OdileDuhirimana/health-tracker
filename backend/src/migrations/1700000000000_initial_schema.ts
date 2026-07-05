import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1700000000000 implements MigrationInterface {
    name = 'InitialSchema1700000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Every UUID primary key below defaults to `uuid_generate_v4()`,
        // which is part of the `uuid-ossp` extension, not Postgres core.
        // TypeORM's `synchronize` (used in local development) silently
        // enables this extension as part of its schema-sync process, which
        // masked the fact that no migration ever did — confirmed by running
        // this migration against a genuinely fresh `postgres:16-alpine`
        // container with no prior `synchronize` history, which failed with
        // `function uuid_generate_v4() does not exist` until this line was
        // added. This is the same class of "works via synchronize, breaks
        // via migrations-only" bug this migration file exists to fix for
        // the dispensation bucket columns — caught the same way, by
        // deliberately testing the actual production schema path instead of
        // trusting that CI (which also runs with synchronize) would catch it.
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "patient_enrollments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "patientId" uuid NOT NULL, "programId" uuid NOT NULL, "assignedStaffId" uuid, "enrollmentDate" date NOT NULL, "endDate" date, "completedDate" date, "adherenceRate" double precision, "attendanceRate" double precision, "isCompleted" boolean NOT NULL DEFAULT false, "completionNotes" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5a540ddc7cb217cf7631c65e768" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_c5dc8987923df825581a954540" ON "patient_enrollments" ("patientId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_db90f114d39d302028d0cd7853" ON "patient_enrollments" ("programId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_699e0ef573473b37787f0dde29" ON "patient_enrollments" ("assignedStaffId") `);
        await queryRunner.query(`DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendances_status_enum') THEN
            CREATE TYPE "public"."attendances_status_enum" AS ENUM('Present', 'Absent', 'Late', 'Excused', 'Canceled');
          END IF;
        END $$;`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "attendances" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "patientId" uuid NOT NULL, "programId" uuid, "attendanceDate" date, "status" "public"."attendances_status_enum" NOT NULL DEFAULT 'Absent', "sessionNumber" integer, "isMissed" boolean NOT NULL DEFAULT false, "checkInTime" TIMESTAMP, "notes" character varying, "markedById" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_483ed97cd4cd43ab4a117516b69" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_e809799792a59136ce45f0a687" ON "attendances" ("patientId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_821ae752b173ac703270e97735" ON "attendances" ("programId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_d47ab1d4e8dc509a43292943f0" ON "attendances" ("attendanceDate") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_d3e8821145edf7a44469bfe391" ON "attendances" ("markedById") `);
        await queryRunner.query(`DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'patients_gender_enum') THEN
            CREATE TYPE "public"."patients_gender_enum" AS ENUM('Male', 'Female', 'Other');
          END IF;
        END $$;`);
        await queryRunner.query(`DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'patients_status_enum') THEN
            CREATE TYPE "public"."patients_status_enum" AS ENUM('Active', 'Inactive');
          END IF;
        END $$;`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "patients" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fullName" character varying NOT NULL, "dateOfBirth" date NOT NULL, "gender" "public"."patients_gender_enum" NOT NULL, "contactNumber" character varying, "email" character varying, "address" text, "emergencyContact" character varying, "medicalNotes" text, "status" "public"."patients_status_enum" NOT NULL DEFAULT 'Active', "patientId" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_a4541d8ee871783657d9b139463" UNIQUE ("patientId"), CONSTRAINT "PK_a7f0b9fcbb3469d5ec0b0aceaa7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_9f74276fa507d8b2dbbf22dbf9" ON "patients" ("contactNumber") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_64e2031265399f5690b0beba6a" ON "patients" ("email") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_fb6618b50d4760c8d948bfad1e" ON "patients" ("status") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_a4541d8ee871783657d9b13946" ON "patients" ("patientId") `);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "dispensations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "patientId" uuid NOT NULL, "medicationId" uuid NOT NULL, "programId" uuid NOT NULL, "dispensedAt" TIMESTAMP NOT NULL, "nextDueDate" TIMESTAMP, "missed" boolean NOT NULL DEFAULT false, "duplicateAttempt" boolean NOT NULL DEFAULT false, "notes" character varying, "dispensedById" uuid NOT NULL, "bucketType" character varying(10), "bucketStart" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "uq_dispensation_bucket" UNIQUE ("patientId", "medicationId", "bucketType", "bucketStart"), CONSTRAINT "PK_2fd4df898cc037676b04fffbe7c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_51786e10007b449f455fc105f3" ON "dispensations" ("patientId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_c6a4f06cc4f945f8053dc7c9b4" ON "dispensations" ("medicationId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_41a81e5c993dc02ac91b78615b" ON "dispensations" ("programId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_b86c42e433a2fb8e5b2ef67b70" ON "dispensations" ("dispensedAt") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_b570e53747dca523fae0a7aea4" ON "dispensations" ("dispensedById") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_a0efe36b91b44da6532d5a0e3b" ON "dispensations" ("bucketType") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_52e2c65ec14c902c24ce0c2517" ON "dispensations" ("bucketStart") `);
        await queryRunner.query(`DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'medications_frequency_enum') THEN
            CREATE TYPE "public"."medications_frequency_enum" AS ENUM('Daily', 'Twice Daily', 'Weekly', 'Monthly');
          END IF;
        END $$;`);
        await queryRunner.query(`DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'medications_status_enum') THEN
            CREATE TYPE "public"."medications_status_enum" AS ENUM('Active', 'Inactive');
          END IF;
        END $$;`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "medications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "dosage" character varying NOT NULL, "frequency" "public"."medications_frequency_enum" NOT NULL DEFAULT 'Daily', "status" "public"."medications_status_enum" NOT NULL DEFAULT 'Active', "programType" character varying, "supplyDurationDays" integer NOT NULL DEFAULT '30', "medicationId" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_58cf6fe8ed9c7df9606f2438d38" UNIQUE ("medicationId"), CONSTRAINT "PK_cdee49fe7cd79db13340150d356" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_4c71a8a6de0a811702d1ef8d73" ON "medications" ("name") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_391b5dd43dd6e4175862b0eef0" ON "medications" ("status") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_a59b2b1b68af0aa7a41872477f" ON "medications" ("programType") `);
        await queryRunner.query(`DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'programs_type_enum') THEN
            CREATE TYPE "public"."programs_type_enum" AS ENUM('Mental Health', 'Vaccination', 'Diabetes', 'Other');
          END IF;
        END $$;`);
        await queryRunner.query(`DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'programs_durationunit_enum') THEN
            CREATE TYPE "public"."programs_durationunit_enum" AS ENUM('days', 'weeks', 'months');
          END IF;
        END $$;`);
        await queryRunner.query(`DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'programs_status_enum') THEN
            CREATE TYPE "public"."programs_status_enum" AS ENUM('Active', 'Inactive');
          END IF;
        END $$;`);
        await queryRunner.query(`DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'programs_sessionfrequency_enum') THEN
            CREATE TYPE "public"."programs_sessionfrequency_enum" AS ENUM('daily', 'weekly', 'monthly');
          END IF;
        END $$;`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "programs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "type" "public"."programs_type_enum" NOT NULL, "description" text, "duration" integer, "durationUnit" "public"."programs_durationunit_enum", "durationInDays" integer NOT NULL DEFAULT '90', "totalSessions" integer, "status" "public"."programs_status_enum" NOT NULL DEFAULT 'Active', "sessionFrequency" "public"."programs_sessionfrequency_enum" NOT NULL DEFAULT 'weekly', "components" json, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d43c664bcaafc0e8a06dfd34e05" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ba50d0f7b68ee5b73f7e7b8fdf" ON "programs" ("name") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_85404f4110b5852077a481b869" ON "programs" ("type") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_4d27843d20a4266a9f9285b84e" ON "programs" ("status") `);
        await queryRunner.query(`DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_role_enum') THEN
            CREATE TYPE "public"."users_role_enum" AS ENUM('Admin', 'Healthcare Staff', 'Guest');
          END IF;
        END $$;`);
        await queryRunner.query(`DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_status_enum') THEN
            CREATE TYPE "public"."users_status_enum" AS ENUM('Active', 'Inactive');
          END IF;
        END $$;`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'Healthcare Staff', "status" "public"."users_status_enum" NOT NULL DEFAULT 'Active', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notifications_type_enum') THEN
            CREATE TYPE "public"."notifications_type_enum" AS ENUM('medication', 'session', 'attendance', 'enrollment', 'alert');
          END IF;
        END $$;`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."notifications_type_enum" NOT NULL, "title" character varying NOT NULL, "message" text NOT NULL, "read" boolean NOT NULL DEFAULT false, "link" character varying, "userId" uuid NOT NULL, "timestamp" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_logs_type_enum') THEN
            CREATE TYPE "public"."activity_logs_type_enum" AS ENUM('enrollment', 'medication', 'attendance', 'program', 'user', 'session');
          END IF;
        END $$;`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "activity_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."activity_logs_type_enum" NOT NULL, "description" text NOT NULL, "userId" uuid NOT NULL, "metadata" jsonb, "timestamp" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f25287b6140c5ba18d38776a796" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_e0ce6dc62364ddff528cd816a3" ON "activity_logs" ("type") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_597e6df96098895bf19d4b5ea4" ON "activity_logs" ("userId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_9e8702f84adf60cf8e561e1696" ON "activity_logs" ("timestamp") `);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "program_medications" ("programsId" uuid NOT NULL, "medicationsId" uuid NOT NULL, CONSTRAINT "PK_66b698ca1300906862fb22220e4" PRIMARY KEY ("programsId", "medicationsId"))`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_6d8d9b568fb317744f63258627" ON "program_medications" ("programsId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_5ef034e4ea8092cf2c80418e0c" ON "program_medications" ("medicationsId") `);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "user_programs" ("usersId" uuid NOT NULL, "programsId" uuid NOT NULL, CONSTRAINT "PK_1ac3023acb773ab20534763447f" PRIMARY KEY ("usersId", "programsId"))`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_23f14a9591eb18506097c02198" ON "user_programs" ("usersId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_660bacf7aa8226a1bd3590f68c" ON "user_programs" ("programsId") `);
        await queryRunner.query(`DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_c5dc8987923df825581a954540f') THEN
            ALTER TABLE "patient_enrollments" ADD CONSTRAINT "FK_c5dc8987923df825581a954540f" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
          END IF;
        END $$;`);
        await queryRunner.query(`DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_db90f114d39d302028d0cd78534') THEN
            ALTER TABLE "patient_enrollments" ADD CONSTRAINT "FK_db90f114d39d302028d0cd78534" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
          END IF;
        END $$;`);
        await queryRunner.query(`DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_699e0ef573473b37787f0dde29d') THEN
            ALTER TABLE "patient_enrollments" ADD CONSTRAINT "FK_699e0ef573473b37787f0dde29d" FOREIGN KEY ("assignedStaffId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
          END IF;
        END $$;`);
        await queryRunner.query(`DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_e809799792a59136ce45f0a6876') THEN
            ALTER TABLE "attendances" ADD CONSTRAINT "FK_e809799792a59136ce45f0a6876" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
          END IF;
        END $$;`);
        await queryRunner.query(`DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_821ae752b173ac703270e977357') THEN
            ALTER TABLE "attendances" ADD CONSTRAINT "FK_821ae752b173ac703270e977357" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
          END IF;
        END $$;`);
        await queryRunner.query(`DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_d3e8821145edf7a44469bfe391a') THEN
            ALTER TABLE "attendances" ADD CONSTRAINT "FK_d3e8821145edf7a44469bfe391a" FOREIGN KEY ("markedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
          END IF;
        END $$;`);
        await queryRunner.query(`DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_51786e10007b449f455fc105f39') THEN
            ALTER TABLE "dispensations" ADD CONSTRAINT "FK_51786e10007b449f455fc105f39" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
          END IF;
        END $$;`);
        await queryRunner.query(`DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_c6a4f06cc4f945f8053dc7c9b42') THEN
            ALTER TABLE "dispensations" ADD CONSTRAINT "FK_c6a4f06cc4f945f8053dc7c9b42" FOREIGN KEY ("medicationId") REFERENCES "medications"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
          END IF;
        END $$;`);
        await queryRunner.query(`DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_41a81e5c993dc02ac91b78615be') THEN
            ALTER TABLE "dispensations" ADD CONSTRAINT "FK_41a81e5c993dc02ac91b78615be" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
          END IF;
        END $$;`);
        await queryRunner.query(`DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_b570e53747dca523fae0a7aea46') THEN
            ALTER TABLE "dispensations" ADD CONSTRAINT "FK_b570e53747dca523fae0a7aea46" FOREIGN KEY ("dispensedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
          END IF;
        END $$;`);
        await queryRunner.query(`DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_692a909ee0fa9383e7859f9b406') THEN
            ALTER TABLE "notifications" ADD CONSTRAINT "FK_692a909ee0fa9383e7859f9b406" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
          END IF;
        END $$;`);
        await queryRunner.query(`DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_597e6df96098895bf19d4b5ea45') THEN
            ALTER TABLE "activity_logs" ADD CONSTRAINT "FK_597e6df96098895bf19d4b5ea45" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
          END IF;
        END $$;`);
        await queryRunner.query(`DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_6d8d9b568fb317744f63258627f') THEN
            ALTER TABLE "program_medications" ADD CONSTRAINT "FK_6d8d9b568fb317744f63258627f" FOREIGN KEY ("programsId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
        END $$;`);
        await queryRunner.query(`DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_5ef034e4ea8092cf2c80418e0c8') THEN
            ALTER TABLE "program_medications" ADD CONSTRAINT "FK_5ef034e4ea8092cf2c80418e0c8" FOREIGN KEY ("medicationsId") REFERENCES "medications"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
          END IF;
        END $$;`);
        await queryRunner.query(`DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_23f14a9591eb18506097c021980') THEN
            ALTER TABLE "user_programs" ADD CONSTRAINT "FK_23f14a9591eb18506097c021980" FOREIGN KEY ("usersId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
        END $$;`);
        await queryRunner.query(`DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_660bacf7aa8226a1bd3590f68c2') THEN
            ALTER TABLE "user_programs" ADD CONSTRAINT "FK_660bacf7aa8226a1bd3590f68c2" FOREIGN KEY ("programsId") REFERENCES "programs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
          END IF;
        END $$;`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_programs" DROP CONSTRAINT IF EXISTS "FK_660bacf7aa8226a1bd3590f68c2"`);
        await queryRunner.query(`ALTER TABLE "user_programs" DROP CONSTRAINT IF EXISTS "FK_23f14a9591eb18506097c021980"`);
        await queryRunner.query(`ALTER TABLE "program_medications" DROP CONSTRAINT IF EXISTS "FK_5ef034e4ea8092cf2c80418e0c8"`);
        await queryRunner.query(`ALTER TABLE "program_medications" DROP CONSTRAINT IF EXISTS "FK_6d8d9b568fb317744f63258627f"`);
        await queryRunner.query(`ALTER TABLE "activity_logs" DROP CONSTRAINT IF EXISTS "FK_597e6df96098895bf19d4b5ea45"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "FK_692a909ee0fa9383e7859f9b406"`);
        await queryRunner.query(`ALTER TABLE "dispensations" DROP CONSTRAINT IF EXISTS "FK_b570e53747dca523fae0a7aea46"`);
        await queryRunner.query(`ALTER TABLE "dispensations" DROP CONSTRAINT IF EXISTS "FK_41a81e5c993dc02ac91b78615be"`);
        await queryRunner.query(`ALTER TABLE "dispensations" DROP CONSTRAINT IF EXISTS "FK_c6a4f06cc4f945f8053dc7c9b42"`);
        await queryRunner.query(`ALTER TABLE "dispensations" DROP CONSTRAINT IF EXISTS "FK_51786e10007b449f455fc105f39"`);
        await queryRunner.query(`ALTER TABLE "attendances" DROP CONSTRAINT IF EXISTS "FK_d3e8821145edf7a44469bfe391a"`);
        await queryRunner.query(`ALTER TABLE "attendances" DROP CONSTRAINT IF EXISTS "FK_821ae752b173ac703270e977357"`);
        await queryRunner.query(`ALTER TABLE "attendances" DROP CONSTRAINT IF EXISTS "FK_e809799792a59136ce45f0a6876"`);
        await queryRunner.query(`ALTER TABLE "patient_enrollments" DROP CONSTRAINT IF EXISTS "FK_699e0ef573473b37787f0dde29d"`);
        await queryRunner.query(`ALTER TABLE "patient_enrollments" DROP CONSTRAINT IF EXISTS "FK_db90f114d39d302028d0cd78534"`);
        await queryRunner.query(`ALTER TABLE "patient_enrollments" DROP CONSTRAINT IF EXISTS "FK_c5dc8987923df825581a954540f"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_660bacf7aa8226a1bd3590f68c"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_23f14a9591eb18506097c02198"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "user_programs"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_5ef034e4ea8092cf2c80418e0c"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_6d8d9b568fb317744f63258627"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "program_medications"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_9e8702f84adf60cf8e561e1696"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_597e6df96098895bf19d4b5ea4"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_e0ce6dc62364ddff528cd816a3"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "activity_logs"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."activity_logs_type_enum"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."notifications_type_enum"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_role_enum"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_4d27843d20a4266a9f9285b84e"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_85404f4110b5852077a481b869"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_ba50d0f7b68ee5b73f7e7b8fdf"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "programs"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."programs_sessionfrequency_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."programs_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."programs_durationunit_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."programs_type_enum"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_a59b2b1b68af0aa7a41872477f"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_391b5dd43dd6e4175862b0eef0"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_4c71a8a6de0a811702d1ef8d73"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "medications"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."medications_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."medications_frequency_enum"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_52e2c65ec14c902c24ce0c2517"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_a0efe36b91b44da6532d5a0e3b"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_b570e53747dca523fae0a7aea4"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_b86c42e433a2fb8e5b2ef67b70"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_41a81e5c993dc02ac91b78615b"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_c6a4f06cc4f945f8053dc7c9b4"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_51786e10007b449f455fc105f3"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "dispensations"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_a4541d8ee871783657d9b13946"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_fb6618b50d4760c8d948bfad1e"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_64e2031265399f5690b0beba6a"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_9f74276fa507d8b2dbbf22dbf9"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "patients"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."patients_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."patients_gender_enum"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_d3e8821145edf7a44469bfe391"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_d47ab1d4e8dc509a43292943f0"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_821ae752b173ac703270e97735"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_e809799792a59136ce45f0a687"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "attendances"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."attendances_status_enum"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_699e0ef573473b37787f0dde29"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_db90f114d39d302028d0cd7853"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_c5dc8987923df825581a954540"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "patient_enrollments"`);

        // Deliberately not dropping the "uuid-ossp" extension: extensions
        // are database-wide, and another migration or manual operation may
        // depend on it independent of this specific schema. Dropping shared
        // infrastructure as part of reverting one migration is exactly the
        // kind of surprising side effect a `down()` shouldn't have.
    }

}
