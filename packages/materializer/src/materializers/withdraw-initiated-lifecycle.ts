import { BaseMaterializer, EventCursor } from './base.js';
import { ponderDb } from '../db/ponder.js';
import { prisma } from '../db/prisma.js';
import { withdrawInitiated } from '@dashtec/indexer-ponder/ponder.schema';
import { sql, asc } from 'drizzle-orm';

/** Materializes WithdrawInitiated events to permanent storage. */
export class WithdrawInitiatedLifecycleMaterializer extends BaseMaterializer {
  constructor() {
    super('withdraw_initiated_lifecycle');
  }

  protected async fetchBatch(cursor: EventCursor) {
    return ponderDb
      .select({
        id: withdrawInitiated.id,
        attester_address: withdrawInitiated.attester_address,
        recipient_address: withdrawInitiated.recipient_address,
        rollup_address: withdrawInitiated.rollup_address,
        amount: sql<string>`${withdrawInitiated.amount}::text`.as('amount'),
        block_number: sql<string>`${withdrawInitiated.block_number}::text`.as('block_number'),
        log_index: sql<string>`${withdrawInitiated.log_index}::text`.as('log_index'),
        transaction_hash: withdrawInitiated.tx_hash,
        timestamp: withdrawInitiated.timestamp,
      })
      .from(withdrawInitiated)
      .where(this.buildCursorCondition(
        sql`${withdrawInitiated.block_number}`,
        sql`${withdrawInitiated.log_index}`,
        cursor
      ))
      .orderBy(
        asc(sql`${withdrawInitiated.block_number}::bigint`),
        asc(sql`${withdrawInitiated.log_index}::bigint`)
      )
      .limit(this.batchSize);
  }

  protected async materializeBatch(rows: any[]) {
    for (const row of rows) {
      await prisma.materializedValidatorWithdrawInitiated.upsert({
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
    await prisma.materializedValidatorWithdrawInitiated.deleteMany({
      where: { block_number: { gt: BigInt(blockNumber) } },
    });
  }

  protected async countRemaining() {
    return prisma.materializedValidatorWithdrawInitiated.count();
  }
}
