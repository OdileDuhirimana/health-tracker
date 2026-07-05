import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fixes a schema-drift bug where the `Dispensation` entity and
 * `DispensationsService` read/write `bucketType` / `bucketStart` columns and
 * rely on a `uq_dispensation_bucket` unique constraint on
 * (patientId, medicationId, bucketType, bucketStart) to prevent duplicate
 * medication dispensations within the same day/month window — but no prior
 * migration ever created those columns or that constraint. The only related
 * migration (`1710000000000_health_refactor`) added a *different*,
 * never-consumed pair of columns (`frequency`, `bucketStartAt`) and a partial
 * unique index over those columns instead.
 *
 * Because `synchronize` is only enabled when `NODE_ENV=development` (see
 * `src/config/database.config.ts`), this drift was invisible in local dev and
 * in the CI/e2e environment (which also runs with `NODE_ENV=development` and
 * lets TypeORM synchronize the schema from entities directly). In a real
 * production deploy — `synchronize: false`, schema driven solely by migrations
 * — `bucketType`/`bucketStart` never existed, so every `POST /dispensations`
 * call would fail with a raw "column does not exist" database error, and the
 * README's claim that duplicate dispensation is "enforced at the database
 * layer" was false. See docs/adr and the code-review report for the full
 * writeup of this finding.
 *
 * This migration:
 *  1. Adds the columns the entity/service actually use.
 *  2. Backfills them for any existing rows using dispensedAt + the
 *     dispensed medication's frequency (defaulting to a daily bucket when a
 *     medication can't be resolved, which is the conservative choice — it
 *     narrows the dedup window rather than silently widening it).
 *  3. Adds the real `uq_dispensation_bucket` unique constraint and supporting
 *     indexes.
 *  4. Drops the obsolete, never-consumed `frequency` / `bucketStartAt`
 *     columns and their associated index/partial-unique-index.
 */
export class FixDispensationBucketSchema1740000000000 implements MigrationInterface {
  name = 'FixDispensationBucketSchema1740000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add the columns the entity/service actually read and write.
    await queryRunner.query(
      `ALTER TABLE dispensations ADD COLUMN IF NOT EXISTS "bucketType" varchar(10)`,
    );
    await queryRunner.query(
      `ALTER TABLE dispensations ADD COLUMN IF NOT EXISTS "bucketStart" timestamp`,
    );

    // 2. Backfill existing rows. A dispensation is bucketed as 'MONTH' if its
    // medication's frequency is Monthly, otherwise 'DAY' — mirroring the
    // exact logic in DispensationsService.create(). Medications may have
    // been deleted since a dispensation was recorded, so this LEFT JOINs and
    // falls back to a daily bucket (the narrower, safer default) rather than
    // leaving the column null.
    await queryRunner.query(`
      UPDATE dispensations d
      SET
        "bucketType" = CASE WHEN m.frequency = 'Monthly' THEN 'MONTH' ELSE 'DAY' END,
        "bucketStart" = CASE
          WHEN m.frequency = 'Monthly' THEN date_trunc('month', d."dispensedAt")
          ELSE date_trunc('day', d."dispensedAt")
        END
      FROM dispensations d2
      LEFT JOIN medications m ON m.id = d2."medicationId"
      WHERE d.id = d2.id
        AND (d."bucketType" IS NULL OR d."bucketStart" IS NULL)
    `);

    // 3. Real indexes + the unique constraint the entity declares
    // (`@Unique('uq_dispensation_bucket', [...])`), matching what TypeORM's
    // `synchronize` would generate — a plain UNIQUE constraint, not a
    // partial index, so it applies uniformly once every row has been
    // backfilled above.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_dispensation_bucketType" ON dispensations ("bucketType")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_dispensation_bucketStart" ON dispensations ("bucketStart")`,
    );
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_dispensation_bucket'
      ) THEN
        ALTER TABLE dispensations
          ADD CONSTRAINT uq_dispensation_bucket
          UNIQUE ("patientId", "medicationId", "bucketType", "bucketStart");
      END IF;
    END $$;`);

    // 4. Drop the obsolete columns/index from the earlier, never-consumed
    // attempt at this feature — keeping them around would let a future
    // reader mistake them for the real mechanism a second time.
    await queryRunner.query(`DROP INDEX IF EXISTS uniq_dispensation_bucket_partial`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_dispensation_bucket`);
    await queryRunner.query(
      `ALTER TABLE dispensations DROP COLUMN IF EXISTS "bucketStartAt"`,
    );
    await queryRunner.query(`ALTER TABLE dispensations DROP COLUMN IF EXISTS frequency`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore the columns this migration dropped so `migration:revert` is
    // symmetric, even though they were dead weight.
    await queryRunner.query(`ALTER TABLE dispensations ADD COLUMN IF NOT EXISTS frequency text`);
    await queryRunner.query(
      `ALTER TABLE dispensations ADD COLUMN IF NOT EXISTS "bucketStartAt" timestamptz`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_dispensation_bucket ON dispensations ("patientId","medicationId",frequency,"bucketStartAt")`,
    );
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

    await queryRunner.query(
      `ALTER TABLE dispensations DROP CONSTRAINT IF EXISTS uq_dispensation_bucket`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dispensation_bucketStart"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dispensation_bucketType"`);
    await queryRunner.query(`ALTER TABLE dispensations DROP COLUMN IF EXISTS "bucketStart"`);
    await queryRunner.query(`ALTER TABLE dispensations DROP COLUMN IF EXISTS "bucketType"`);
  }
}
