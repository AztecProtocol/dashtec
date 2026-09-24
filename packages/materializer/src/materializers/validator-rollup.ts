import { BaseMaterializer, EventCursor } from './base.js';
import { ponderDb } from '../db/ponder.js';
import { prisma } from '../db/prisma.js';
import { config } from '../config.js';
import { deposit, gseDeposit } from '@dashtec/indexer-ponder/ponder.schema';
import { sql, asc } from 'drizzle-orm';
import { backfillMigratedValidators, refreshMigrationStatus } from '../services/validator-rollup-sync.js';

/** Materializes validator-rollup mappings from deposit events and derives migration status. */
export class ValidatorRollupMaterializer extends BaseMaterializer {
  constructor() {
    super('validator_rollup');
  }

  protected async fetchBatch(cursor: EventCursor) {
    const depositRows = await ponderDb
      .select({
        id: deposit.id,
        attester_address: deposit.attester_address,
        rollup_address: deposit.rollup_address,
        deposit_type: sql<string>`'rollup'`.as('deposit_type'),
        block_number: sql<string>`${deposit.block_number}::text`.as('block_number'),
        log_index: sql<string>`${deposit.log_index}::text`.as('log_index'),
        transaction_hash: deposit.tx_hash,
      })
      .from(deposit)
      .where(this.buildCursorCondition(sql`${deposit.block_number}`, sql`${deposit.log_index}`, cursor))
      .orderBy(asc(sql`${deposit.block_number}::bigint`), asc(sql`${deposit.log_index}::bigint`))
      .limit(this.batchSize);

    const gseRows = await ponderDb
      .select({
        id: gseDeposit.id,
        attester_address: gseDeposit.attester_address,
        // NOT instance_address. For a moveWithLatestRollup deposit that column
        // holds the GSE's bonus sentinel, which is not a rollup and matches no
        // rollup filter — writing it here populates ValidatorRollup while leaving
        // the validator registry empty. The handler resolves it to the rollup
        // that was canonical at the deposit block; older rows predating that
        // column fall back to the instance.
        rollup_address: sql<string>`COALESCE(${gseDeposit.resolved_rollup_address}, ${gseDeposit.instance_address})`.as('rollup_address'),
        deposit_type: sql<string>`'gse'`.as('deposit_type'),
        block_number: gseDeposit.block_number,
        log_index: gseDeposit.log_index,
        transaction_hash: gseDeposit.transaction_hash,
      })
      .from(gseDeposit)
      .where(this.buildCursorCondition(sql`${gseDeposit.block_number}`, sql`${gseDeposit.log_index}`, cursor))
      .orderBy(asc(sql`${gseDeposit.block_number}::bigint`), asc(sql`${gseDeposit.log_index}::bigint`))
      .limit(this.batchSize);

    const all = [...depositRows, ...gseRows].sort((a, b) => {
      const blockCmp = BigInt(a.block_number) - BigInt(b.block_number);
      if (blockCmp !== 0n) return blockCmp > 0n ? 1 : -1;
      return BigInt(a.log_index) - BigInt(b.log_index) > 0n ? 1 : -1;
    });

    return all.slice(0, this.batchSize);
  }

  protected async materializeBatch(rows: any[]) {
    for (const row of rows) {
      await prisma.validatorRollup.upsert({
        where: {
          unique_validator_rollup: {
            address: row.attester_address,
            rollup_address: row.rollup_address,
          },
        },
        create: {
          address: row.attester_address,
          rollup_address: row.rollup_address,
          migration_status: 'active',
          deposit_type: row.deposit_type,
          block_number: BigInt(row.block_number),
          log_index: Number(row.log_index),
          transaction_hash: row.transaction_hash,
        },
        update: {},
      });
    }

    await backfillMigratedValidators();
    await refreshMigrationStatus();
  }

  protected extractCursor(row: any): EventCursor {
    return { blockNumber: row.block_number.toString(), logIndex: row.log_index.toString() };
  }

  protected async deleteAfterBlock(blockNumber: string) {
    await prisma.validatorRollup.deleteMany({
      where: { block_number: { gt: BigInt(blockNumber) } },
    });
    await refreshMigrationStatus();
  }

  protected async countRemaining() {
    return prisma.validatorRollup.count();
  }
}
