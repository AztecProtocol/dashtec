import { BaseMaterializer, EventCursor } from './base.js';
import { ponderDb } from '../db/ponder.js';
import { prisma } from '../db/prisma.js';
import { validatorQueue } from '@dashtec/indexer-ponder/ponder.schema';
import { sql, asc } from 'drizzle-orm';

/** Materializes ValidatorQueued events to permanent storage. */
export class QueuedLifecycleMaterializer extends BaseMaterializer {
  constructor() {
    super('queued_lifecycle');
  }

  protected async fetchBatch(cursor: EventCursor) {
    return ponderDb
      .select({
        id: validatorQueue.id,
        attester_address: validatorQueue.attester_address,
        withdrawer_address: validatorQueue.withdrawer_address,
        rollup_address: validatorQueue.rollup_address,
        block_number: validatorQueue.block_number,
        log_index: validatorQueue.log_index,
        transaction_hash: validatorQueue.transaction_hash,
        timestamp: validatorQueue.timestamp,
      })
      .from(validatorQueue)
      .where(this.buildCursorCondition(
        sql`${validatorQueue.block_number}`,
        sql`${validatorQueue.log_index}`,
        cursor
      ))
      .orderBy(
        asc(sql`${validatorQueue.block_number}::bigint`),
        asc(sql`${validatorQueue.log_index}::bigint`)
      )
      .limit(this.batchSize);
  }

  protected async materializeBatch(rows: any[]) {
    for (const row of rows) {
      await prisma.materializedValidatorQueued.upsert({
        where: { id: row.id },
        create: {
          id: row.id,
          attester_address: row.attester_address,
          withdrawer_address: row.withdrawer_address,
          rollup_address: row.rollup_address,
          block_number: BigInt(row.block_number),
          log_index: Number(row.log_index),
          transaction_hash: row.transaction_hash,
          timestamp: row.timestamp ? BigInt(row.timestamp) : null,
        },
        update: {},
      });
    }
  }

  protected extractCursor(row: any): EventCursor {
    return { blockNumber: row.block_number.toString(), logIndex: row.log_index.toString() };
  }

  protected async deleteAfterBlock(blockNumber: string) {
    await prisma.materializedValidatorQueued.deleteMany({
      where: { block_number: { gt: BigInt(blockNumber) } },
    });
  }

  protected async countRemaining() {
    return prisma.materializedValidatorQueued.count();
  }
}
