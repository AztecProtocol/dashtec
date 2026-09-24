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
        resolved_rollup_address: gseDeposit.resolved_rollup_address,
        block_number: gseDeposit.block_number,
        log_index: gseDeposit.log_index,
        transaction_hash: gseDeposit.transaction_hash,
        timestamp: gseDeposit.timestamp,
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
      // GSE.Deposit emits no BLS material, so `extra` carries only the columns
      // the handler derives from getAttesterView. BLS keys for validators who
      // staked directly on the rollup remain on MaterializedValidatorDeposit.
      const extra = {
        attester_status: row.attester_status,
        effective_balance: row.effective_balance,
        validator_hex_index: row.validator_hex_index,
        resolved_rollup_address: row.resolved_rollup_address,
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
