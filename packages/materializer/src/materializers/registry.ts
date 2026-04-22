import { BaseMaterializer, EventCursor } from './base.js';
import { ponderDb } from '../db/ponder.js';
import { prisma } from '../db/prisma.js';
import { canonicalRollupUpdated } from '@dashtec/indexer-ponder/ponder.schema';
import { sql, asc } from 'drizzle-orm';
import { backfillMigratedValidators, refreshMigrationStatus } from '../services/validator-rollup-sync.js';

/** Materializes CanonicalRollupUpdated events from Ponder to Prisma. */
export class CanonicalRollupUpdatedMaterializer extends BaseMaterializer {
  constructor() {
    super('canonical_rollup_updated');
  }

  protected async fetchBatch(cursor: EventCursor) {
    return ponderDb
      .select()
      .from(canonicalRollupUpdated)
      .where(this.buildCursorCondition(
        sql`${canonicalRollupUpdated.block_number}`,
        sql`${canonicalRollupUpdated.log_index}`,
        cursor
      ))
      .orderBy(
        asc(sql`${canonicalRollupUpdated.block_number}::bigint`),
        asc(sql`${canonicalRollupUpdated.log_index}::bigint`)
      )
      .limit(this.batchSize);
  }

  protected async materializeBatch(rows: (typeof canonicalRollupUpdated.$inferSelect)[]) {
    for (const row of rows) {
      await prisma.canonicalRollupUpdated.upsert({
        where: { id: row.id },
        create: {
          id: row.id,
          instance_address: row.instance_address,
          version: row.version,
          block_number: BigInt(row.block_number),
          transaction_hash: row.transaction_hash,
          log_index: Number(row.log_index),
          timestamp: row.timestamp,
        },
        update: {
          instance_address: row.instance_address,
          version: row.version,
          block_number: BigInt(row.block_number),
          timestamp: row.timestamp,
        },
      });
    }

    // New canonical rollup registered — backfill ValidatorRollup entries for migrating validators
    await backfillMigratedValidators();
    await refreshMigrationStatus();
  }

  protected extractCursor(row: typeof canonicalRollupUpdated.$inferSelect): EventCursor {
    return {
      blockNumber: row.block_number.toString(),
      logIndex: row.log_index.toString(),
    };
  }

  protected async deleteAfterBlock(blockNumber: string) {
    await prisma.canonicalRollupUpdated.deleteMany({
      where: { block_number: { gt: BigInt(blockNumber) } },
    });
  }

  protected async countRemaining() {
    return prisma.canonicalRollupUpdated.count();
  }
}
