import { BaseMaterializer, EventCursor } from './base.js';
import { ponderDb } from '../db/ponder.js';
import { prisma } from '../db/prisma.js';
import { gseDeposit } from '@dashtec/indexer-ponder/ponder.schema';
import { sql, asc } from 'drizzle-orm';

/** Materializes GSE Deposit events to permanent storage. */
export class GseDepositLifecycleMaterializer extends BaseMaterializer {
  constructor() {
    super('gse_deposit_lifecycle');
  }

  protected async fetchBatch(cursor: EventCursor) {
    return ponderDb
      .select({
        id: gseDeposit.id,
        attester_address: gseDeposit.attester_address,
        withdrawer_address: gseDeposit.withdrawer_address,
        instance_address: gseDeposit.instance_address,
        move_with_latest_rollup: gseDeposit.move_with_latest_rollup,
        block_number: gseDeposit.block_number,
        log_index: gseDeposit.log_index,
        transaction_hash: gseDeposit.transaction_hash,
        timestamp: gseDeposit.timestamp,
        public_key_g1_x: gseDeposit.public_key_g1_x,
        public_key_g1_y: gseDeposit.public_key_g1_y,
        public_key_g2_x0: gseDeposit.public_key_g2_x0,
        public_key_g2_x1: gseDeposit.public_key_g2_x1,
        public_key_g2_y0: gseDeposit.public_key_g2_y0,
        public_key_g2_y1: gseDeposit.public_key_g2_y1,
        proof_of_possession_x: gseDeposit.proof_of_possession_x,
        proof_of_possession_y: gseDeposit.proof_of_possession_y,
        attester_status: gseDeposit.attester_status,
        effective_balance: gseDeposit.effective_balance,
        validator_hex_index: gseDeposit.validator_hex_index,
      })
      .from(gseDeposit)
      .where(this.buildCursorCondition(
        sql`${gseDeposit.block_number}`,
        sql`${gseDeposit.log_index}`,
        cursor
      ))
      .orderBy(
        asc(sql`${gseDeposit.block_number}::bigint`),
        asc(sql`${gseDeposit.log_index}::bigint`)
      )
      .limit(this.batchSize);
  }

  protected async materializeBatch(rows: any[]) {
    for (const row of rows) {
      const extra = {
        publicKeyInG1: { x: row.public_key_g1_x, y: row.public_key_g1_y },
        publicKeyInG2: { x0: row.public_key_g2_x0, x1: row.public_key_g2_x1, y0: row.public_key_g2_y0, y1: row.public_key_g2_y1 },
        proofOfPossession: { x: row.proof_of_possession_x, y: row.proof_of_possession_y },
        attester_status: row.attester_status,
        effective_balance: row.effective_balance,
        validator_hex_index: row.validator_hex_index,
      };

      await prisma.materializedValidatorGseDeposit.upsert({
        where: { id: row.id },
        create: {
          id: row.id,
          attester_address: row.attester_address,
          withdrawer_address: row.withdrawer_address,
          instance_address: row.instance_address,
          move_with_latest_rollup: row.move_with_latest_rollup === 1,
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
    await prisma.materializedValidatorGseDeposit.deleteMany({
      where: { block_number: { gt: BigInt(blockNumber) } },
    });
  }

  protected async countRemaining() {
    return prisma.materializedValidatorGseDeposit.count();
  }
}
