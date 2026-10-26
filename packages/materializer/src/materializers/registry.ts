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

  /**
   * Every rollup version the app knows about comes from this table, so one
   * missing row hides a whole version and stretches its predecessor over it —
   * which is how testnet lost its first V6 rollup while the later ones showed.
   * The cursor only moves forward, so a row lost behind it (a reorg reset that
   * deleted it, say) is never fetched again. The table is a handful of rows,
   * so reconcile all of it against Ponder whenever the stream is idle.
   */
  private lastReconcileMs = 0;

  protected async onIdle() {
    const RECONCILE_INTERVAL_MS = 60_000;
    const now = Date.now();
    if (now - this.lastReconcileMs < RECONCILE_INTERVAL_MS) return;
    this.lastReconcileMs = now;

    const [ponderRows, existing] = await Promise.all([
      ponderDb.select().from(canonicalRollupUpdated),
      prisma.canonicalRollupUpdated.findMany({ select: { id: true } }),
    ]);
    const known = new Set(existing.map((row) => row.id));
    const missing = ponderRows.filter((row) => !known.has(row.id));
    if (missing.length === 0) return;

    this.logger.warn(
      `Restoring ${missing.length} CanonicalRollupUpdated row(s) missing behind the cursor: ` +
      missing.map((row) => `${row.instance_address}@${row.block_number}`).join(', '),
    );
    await this.materializeBatch(missing);
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
