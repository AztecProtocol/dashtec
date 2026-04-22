import { BaseMaterializer, EventCursor } from './base.js';
import { ponderDb } from '../db/ponder.js';
import { prisma } from '../db/prisma.js';
import { withdrawFinalized } from '@dashtec/indexer-ponder/ponder.schema';
import { sql, asc } from 'drizzle-orm';

/** Materializes WithdrawFinalized events to permanent storage. */
export class WithdrawFinalizedLifecycleMaterializer extends BaseMaterializer {
  constructor() {
    super('withdraw_finalized_lifecycle');
  }

  protected async fetchBatch(cursor: EventCursor) {
    return ponderDb
      .select({
        id: withdrawFinalized.id,
        attester_address: withdrawFinalized.attester_address,
        recipient_address: withdrawFinalized.recipient_address,
        rollup_address: withdrawFinalized.rollup_address,
        amount: sql<string>`${withdrawFinalized.amount}::text`.as('amount'),
        block_number: sql<string>`${withdrawFinalized.block_number}::text`.as('block_number'),
        log_index: sql<string>`${withdrawFinalized.log_index}::text`.as('log_index'),
        transaction_hash: withdrawFinalized.tx_hash,
        timestamp: withdrawFinalized.timestamp,
      })
      .from(withdrawFinalized)
      .where(this.buildCursorCondition(
        sql`${withdrawFinalized.block_number}`,
        sql`${withdrawFinalized.log_index}`,
        cursor
      ))
      .orderBy(
        asc(sql`${withdrawFinalized.block_number}::bigint`),
        asc(sql`${withdrawFinalized.log_index}::bigint`)
      )
      .limit(this.batchSize);
  }

  protected async materializeBatch(rows: any[]) {
    for (const row of rows) {
      await prisma.materializedValidatorWithdrawFinalized.upsert({
        where: { id: row.id },
        create: {
          id: row.id,
          attester_address: row.attester_address,
          recipient_address: row.recipient_address,
          rollup_address: row.rollup_address,
          amount: row.amount,
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
    await prisma.materializedValidatorWithdrawFinalized.deleteMany({
      where: { block_number: { gt: BigInt(blockNumber) } },
    });
  }

  protected async countRemaining() {
    return prisma.materializedValidatorWithdrawFinalized.count();
  }
}
