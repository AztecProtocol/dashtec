import { prisma } from '../db/prisma.js';
import { createLogger } from '@dashtec/shared-utils';

const logger = createLogger('ValidatorRollupSync');

/**
 * Backfill ValidatorRollup rows for validators who migrated implicitly.
 * For each existing deposit-based ValidatorRollup entry, find subsequent canonical
 * rollup updates and create migration rows — but only if the validator didn't
 * withdraw from their deposit rollup.
 */
export async function backfillMigratedValidators(): Promise<number> {
  const result: number = await prisma.$executeRaw`
    INSERT INTO "ValidatorRollup" (id, address, rollup_address, migration_status, deposit_type, block_number, transaction_hash, log_index, created_at, updated_at)
    SELECT
      gen_random_uuid(),
      sub.address,
      sub.rollup_address,
      'active',
      'migration',
      sub.block_number,
      sub.transaction_hash,
      sub.synthetic_log_index::integer,
      NOW(),
      NOW()
    FROM (
      SELECT
        vr_deposit.address,
        cu.instance_address AS rollup_address,
        cu.block_number,
        cu.transaction_hash,
        ROW_NUMBER() OVER (PARTITION BY cu.transaction_hash ORDER BY vr_deposit.address) + 100000 AS synthetic_log_index
      FROM "ValidatorRollup" vr_deposit
      JOIN "CanonicalRollupUpdated" cu
        ON cu.block_number::bigint > vr_deposit.block_number::bigint
        AND LOWER(cu.instance_address) != LOWER(vr_deposit.rollup_address)
      WHERE vr_deposit.deposit_type IN ('rollup', 'gse')
      AND NOT EXISTS (
        SELECT 1 FROM "ValidatorRollup" vr_existing
        WHERE LOWER(vr_existing.address) = LOWER(vr_deposit.address)
          AND LOWER(vr_existing.rollup_address) = LOWER(cu.instance_address)
      )
      AND NOT EXISTS (
        SELECT 1 FROM "MaterializedValidatorWithdrawInitiated" wi
        WHERE LOWER(wi.attester_address) = LOWER(vr_deposit.address)
          AND LOWER(wi.rollup_address) = LOWER(vr_deposit.rollup_address)
      )
    ) sub
    ON CONFLICT (address, rollup_address) DO NOTHING
  `;

  if (result > 0) {
    logger.info(`Backfilled ${result} ValidatorRollup migration entries`);
  }
  return result;
}

/**
 * Refresh migration_status for all ValidatorRollup rows by cross-referencing
 * lifecycle tables and the current Validator.rollup_address.
 * Priority: exited > exiting > migrated > active
 */
export async function refreshMigrationStatus(): Promise<number> {
  const result: number = await prisma.$executeRaw`
    UPDATE "ValidatorRollup" vr
    SET migration_status = CASE
      WHEN EXISTS (
        SELECT 1 FROM "MaterializedValidatorWithdrawFinalized" wf
        WHERE wf.attester_address = vr.address AND wf.rollup_address = vr.rollup_address
      ) THEN 'exited'
      WHEN EXISTS (
        SELECT 1 FROM "MaterializedValidatorWithdrawInitiated" wi
        WHERE wi.attester_address = vr.address AND wi.rollup_address = vr.rollup_address
      ) THEN 'exiting'
      WHEN v.rollup_address != vr.rollup_address THEN 'migrated'
      ELSE 'active'
    END,
    updated_at = NOW()
    FROM "Validator" v
    WHERE v.address = vr.address
      AND vr.migration_status != CASE
        WHEN EXISTS (
          SELECT 1 FROM "MaterializedValidatorWithdrawFinalized" wf
          WHERE wf.attester_address = vr.address AND wf.rollup_address = vr.rollup_address
        ) THEN 'exited'
        WHEN EXISTS (
          SELECT 1 FROM "MaterializedValidatorWithdrawInitiated" wi
          WHERE wi.attester_address = vr.address AND wi.rollup_address = vr.rollup_address
        ) THEN 'exiting'
        WHEN v.rollup_address != vr.rollup_address THEN 'migrated'
        ELSE 'active'
      END
  `;

  if (result > 0) {
    logger.info(`Updated migration_status for ${result} ValidatorRollup entries`);
  }
  return result;
}
