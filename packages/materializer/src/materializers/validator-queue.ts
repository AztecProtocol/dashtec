import { BaseMaterializer, EventCursor } from './base.js';
import { prisma } from '../db/prisma.js';
import { Prisma } from '@dashtec/database';

/**
 * Materializes ValidatorQueue state from Materialized lifecycle tables.
 * Sources from MaterializedValidatorQueued, MaterializedValidatorDeposit,
 * MaterializedValidatorGseDeposit, and MaterializedValidatorFailedDeposit.
 *
 * No dependency on Ponder DB — works across all rollups.
 * Replays FIFO queue semantics: adds on queued, removes on deposit/failed.
 */
export class ValidatorQueueMaterializer extends BaseMaterializer {
  constructor() {
    super('validator_queue');
  }

  protected async fetchBatch(cursor: EventCursor) {
    const cursorBlock = cursor.blockNumber;
    const cursorLog = cursor.logIndex;

    // Single raw query merging all 4 source tables, ordered chronologically
    const rows = await prisma.$queryRaw<Array<{
      type: string;
      attester_address: string;
      withdrawer_address: string;
      rollup_address: string;
      block_number: string;
      log_index: string;
      transaction_hash: string;
      timestamp: bigint | null;
    }>>`
      SELECT * FROM (
        SELECT 'add'::text AS type, attester_address, withdrawer_address, rollup_address,
               block_number, log_index, transaction_hash, timestamp
        FROM "MaterializedValidatorQueued"
        WHERE (block_number::bigint > ${BigInt(cursorBlock)}::bigint)
           OR (block_number::bigint = ${BigInt(cursorBlock)}::bigint AND log_index::bigint > ${BigInt(cursorLog)}::bigint)

        UNION ALL

        SELECT 'remove_deposit'::text AS type, attester_address, withdrawer_address, rollup_address,
               block_number, log_index, transaction_hash, timestamp
        FROM "MaterializedValidatorDeposit"
        WHERE (block_number::bigint > ${BigInt(cursorBlock)}::bigint)
           OR (block_number::bigint = ${BigInt(cursorBlock)}::bigint AND log_index::bigint > ${BigInt(cursorLog)}::bigint)

        UNION ALL

        SELECT 'remove_gse'::text AS type, attester_address, withdrawer_address, instance_address AS rollup_address,
               block_number, log_index, transaction_hash, timestamp
        FROM "MaterializedValidatorGseDeposit"
        WHERE (block_number::bigint > ${BigInt(cursorBlock)}::bigint)
           OR (block_number::bigint = ${BigInt(cursorBlock)}::bigint AND log_index::bigint > ${BigInt(cursorLog)}::bigint)

        UNION ALL

        SELECT 'remove_failed'::text AS type, attester_address, withdrawer_address, rollup_address,
               block_number, log_index, transaction_hash, timestamp
        FROM "MaterializedValidatorFailedDeposit"
        WHERE (block_number::bigint > ${BigInt(cursorBlock)}::bigint)
           OR (block_number::bigint = ${BigInt(cursorBlock)}::bigint AND log_index::bigint > ${BigInt(cursorLog)}::bigint)
      ) combined
      ORDER BY block_number::bigint ASC, log_index::bigint ASC
      LIMIT ${this.batchSize}
    `;

    return rows;
  }

  protected async materializeBatch(rows: any[]) {
    for (const row of rows) {
      if (row.type === 'add') {
        await this.addToQueue(row);
      } else {
        await this.removeFromQueue(row);
      }
    }
  }

  /** Add a validator to the queue. Replaces stale entries from older rollups. */
  private async addToQueue(row: any) {
    const queuedAt = row.timestamp ? new Date(Number(row.timestamp) * 1000) : new Date();

    await prisma.validatorQueue.upsert({
      where: {
        unique_validator_queue_transaction_log: {
          transaction_hash: row.transaction_hash,
          log_index: Number(row.log_index),
        },
      },
      create: {
        attester_address: row.attester_address,
        withdrawer_address: row.withdrawer_address,
        block_number: BigInt(row.block_number),
        transaction_hash: row.transaction_hash,
        log_index: Number(row.log_index),
        rollup_address: row.rollup_address,
        queued_at: queuedAt,
      },
      update: {
        attester_address: row.attester_address,
        withdrawer_address: row.withdrawer_address,
        block_number: BigInt(row.block_number),
        rollup_address: row.rollup_address,
        queued_at: queuedAt,
      },
    });
  }

  /** Remove oldest matching queue entry (FIFO semantics). */
  private async removeFromQueue(row: any) {
    const oldestEntry = await prisma.validatorQueue.findFirst({
      where: {
        attester_address: row.attester_address,
        withdrawer_address: row.withdrawer_address,
      },
      orderBy: { queued_at: 'asc' },
    });

    if (oldestEntry) {
      await prisma.validatorQueue.delete({
        where: { id: oldestEntry.id },
      });
    }

    // Update validator activation date on deposit
    if (row.type === 'remove_deposit' && row.timestamp) {
      try {
        await prisma.validator.update({
          where: { address: row.attester_address },
          data: { activation_date: new Date(Number(row.timestamp) * 1000) },
        });
      } catch {
        // Validator record might not exist yet
      }
    }
  }

  protected extractCursor(row: any): EventCursor {
    return {
      blockNumber: row.block_number.toString(),
      logIndex: row.log_index.toString(),
    };
  }

  protected async deleteAfterBlock(blockNumber: string) {
    await prisma.validatorQueue.deleteMany({
      where: { block_number: { gt: BigInt(blockNumber) } },
    });
  }

  protected async countRemaining() {
    return prisma.validatorQueue.count();
  }
}
