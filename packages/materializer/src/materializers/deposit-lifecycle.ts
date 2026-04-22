import { BaseMaterializer, EventCursor } from './base.js';
import { ponderDb } from '../db/ponder.js';
import { prisma } from '../db/prisma.js';
import { deposit } from '@dashtec/indexer-ponder/ponder.schema';
import { sql, asc } from 'drizzle-orm';

/** Materializes Rollup Deposit events to permanent storage. */
export class DepositLifecycleMaterializer extends BaseMaterializer {
  constructor() {
    super('deposit_lifecycle');
  }

  protected async fetchBatch(cursor: EventCursor) {
    return ponderDb
      .select({
        id: deposit.id,
        attester_address: deposit.attester_address,
        withdrawer_address: deposit.withdrawer_address,
        rollup_address: deposit.rollup_address,
        amount: sql<string>`${deposit.amount}::text`.as('amount'),
        block_number: sql<string>`${deposit.block_number}::text`.as('block_number'),
        log_index: sql<string>`${deposit.log_index}::text`.as('log_index'),
        transaction_hash: deposit.tx_hash,
        timestamp: deposit.timestamp,
        public_key_g1_x: sql<string>`${deposit.public_key_g1_x}::text`,
        public_key_g1_y: sql<string>`${deposit.public_key_g1_y}::text`,
        public_key_g2_x0: sql<string>`${deposit.public_key_g2_x0}::text`,
        public_key_g2_x1: sql<string>`${deposit.public_key_g2_x1}::text`,
        public_key_g2_y0: sql<string>`${deposit.public_key_g2_y0}::text`,
        public_key_g2_y1: sql<string>`${deposit.public_key_g2_y1}::text`,
        proof_of_possession_x: sql<string>`${deposit.proof_of_possession_x}::text`,
        proof_of_possession_y: sql<string>`${deposit.proof_of_possession_y}::text`,
      })
      .from(deposit)
      .where(this.buildCursorCondition(
        sql`${deposit.block_number}`,
        sql`${deposit.log_index}`,
        cursor
      ))
      .orderBy(
        asc(sql`${deposit.block_number}::bigint`),
        asc(sql`${deposit.log_index}::bigint`)
      )
      .limit(this.batchSize);
  }

  protected async materializeBatch(rows: any[]) {
    for (const row of rows) {
      const extra = {
        publicKeyInG1: { x: row.public_key_g1_x, y: row.public_key_g1_y },
        publicKeyInG2: { x0: row.public_key_g2_x0, x1: row.public_key_g2_x1, y0: row.public_key_g2_y0, y1: row.public_key_g2_y1 },
        proofOfPossession: { x: row.proof_of_possession_x, y: row.proof_of_possession_y },
      };

      await prisma.materializedValidatorDeposit.upsert({
        where: { id: row.id },
        create: {
          id: row.id,
          attester_address: row.attester_address,
          withdrawer_address: row.withdrawer_address,
          rollup_address: row.rollup_address,
          amount: row.amount,
          block_number: BigInt(row.block_number),
          log_index: Number(row.log_index),
          transaction_hash: row.transaction_hash,
          timestamp: row.timestamp ? BigInt(row.timestamp) : null,
          extra,
        },
        update: {},
      });
    }
  }

  protected extractCursor(row: any): EventCursor {
    return { blockNumber: row.block_number.toString(), logIndex: row.log_index.toString() };
  }

  protected async deleteAfterBlock(blockNumber: string) {
    await prisma.materializedValidatorDeposit.deleteMany({
      where: { block_number: { gt: BigInt(blockNumber) } },
    });
  }

  protected async countRemaining() {
    return prisma.materializedValidatorDeposit.count();
  }
}
