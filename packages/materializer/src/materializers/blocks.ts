import { BaseMaterializer, EventCursor } from './base.js';
import { ponderDb } from '../db/ponder.js';
import { prisma } from '../db/prisma.js';
import { l2BlockProposed, l2ProofVerified } from '@dashtec/indexer-ponder/ponder.schema';
import { sql, asc } from 'drizzle-orm';
import { config } from '../config.js';

/** Materializes L2BlockProposed events from Ponder to Prisma. */
export class BlockProposedMaterializer extends BaseMaterializer {
  constructor() {
    super('block_proposed');
  }

  protected async fetchBatch(cursor: EventCursor) {
    return ponderDb
      .select()
      .from(l2BlockProposed)
      .where(this.buildCursorCondition(
        sql`${l2BlockProposed.block_number}`,
        sql`${l2BlockProposed.log_index}`,
        cursor
      ))
      .orderBy(
        asc(sql`${l2BlockProposed.block_number}::bigint`),
        asc(sql`${l2BlockProposed.log_index}::bigint`)
      )
      .limit(this.batchSize);
  }

  protected async materializeBatch(rows: (typeof l2BlockProposed.$inferSelect)[]) {
    for (const row of rows) {
      await prisma.l2BlockProposed.upsert({
        where: { id: row.id },
        create: {
          id: row.id,
          l2_block_number: row.l2_block_number,
          archive: row.archive,
          versioned_blob_hashes: row.versioned_blob_hashes,
          payload_digest: row.payload_digest ?? null,
          attestations_hash: row.attestations_hash ?? null,
          rollup_address: row.rollup_address,
          block_number: BigInt(row.block_number),
          transaction_hash: row.transaction_hash,
          log_index: Number(row.log_index),
          timestamp: row.timestamp,
          slot_number: row.slot_number,
          coinbase: row.coinbase,
        },
        update: {
          l2_block_number: row.l2_block_number,
          archive: row.archive,
          versioned_blob_hashes: row.versioned_blob_hashes,
          payload_digest: row.payload_digest ?? null,
          attestations_hash: row.attestations_hash ?? null,
          rollup_address: row.rollup_address,
          block_number: BigInt(row.block_number),
          timestamp: row.timestamp,
          slot_number: row.slot_number,
          coinbase: row.coinbase,
        },
      });
    }
  }

  protected extractCursor(row: typeof l2BlockProposed.$inferSelect): EventCursor {
    return {
      blockNumber: row.block_number.toString(),
      logIndex: row.log_index.toString(),
    };
  }

  protected async deleteAfterBlock(blockNumber: string) {
    await prisma.l2BlockProposed.deleteMany({
      where: { block_number: { gt: BigInt(blockNumber) } },
    });
  }

  protected async countRemaining() {
    return prisma.l2BlockProposed.count({ where: { rollup_address: config.ROLLUP_CONTRACT_ADDRESS } });
  }
}

/** Materializes L2ProofVerified events from Ponder to Prisma. */
export class ProofVerifiedMaterializer extends BaseMaterializer {
  constructor() {
    super('proof_verified');
  }

  protected async fetchBatch(cursor: EventCursor) {
    return ponderDb
      .select()
      .from(l2ProofVerified)
      .where(this.buildCursorCondition(
        sql`${l2ProofVerified.block_number}`,
        sql`${l2ProofVerified.log_index}`,
        cursor
      ))
      .orderBy(
        asc(sql`${l2ProofVerified.block_number}::bigint`),
        asc(sql`${l2ProofVerified.log_index}::bigint`)
      )
      .limit(this.batchSize);
  }

  protected async materializeBatch(rows: (typeof l2ProofVerified.$inferSelect)[]) {
    for (const row of rows) {
      await prisma.l2ProofVerified.upsert({
        where: { id: row.id },
        create: {
          id: row.id,
          l2_block_number: row.l2_block_number,
          epoch_number: row.epoch_number,
          prover_id: row.prover_id,
          block_number: BigInt(row.block_number),
          transaction_hash: row.transaction_hash,
          log_index: Number(row.log_index),
          timestamp: row.timestamp,
          rollup_address: row.rollup_address,
          transaction_from: row.transaction_from,
          transaction_to: row.transaction_to ?? null,
          transaction_gas: row.transaction_gas,
          transaction_gas_price: row.transaction_gas_price ?? null,
          transaction_value: row.transaction_value,
          transaction_nonce: row.transaction_nonce,
          transaction_max_fee_per_gas: row.transaction_max_fee_per_gas ?? null,
          transaction_max_priority_fee_per_gas: row.transaction_max_priority_fee_per_gas ?? null,
        },
        update: {
          l2_block_number: row.l2_block_number,
          prover_id: row.prover_id,
          block_number: BigInt(row.block_number),
          epoch_number: row.epoch_number,
          timestamp: row.timestamp,
          rollup_address: row.rollup_address,
          transaction_from: row.transaction_from,
          transaction_to: row.transaction_to ?? null,
          transaction_gas: row.transaction_gas,
          transaction_gas_price: row.transaction_gas_price ?? null,
          transaction_value: row.transaction_value,
          transaction_nonce: row.transaction_nonce,
          transaction_max_fee_per_gas: row.transaction_max_fee_per_gas ?? null,
          transaction_max_priority_fee_per_gas: row.transaction_max_priority_fee_per_gas ?? null,
        },
      });
    }
  }

  protected extractCursor(row: typeof l2ProofVerified.$inferSelect): EventCursor {
    return {
      blockNumber: row.block_number.toString(),
      logIndex: row.log_index.toString(),
    };
  }

  protected async deleteAfterBlock(blockNumber: string) {
    await prisma.l2ProofVerified.deleteMany({
      where: { block_number: { gt: BigInt(blockNumber) } },
    });
  }

  protected async countRemaining() {
    return prisma.l2ProofVerified.count({ where: { rollup_address: config.ROLLUP_CONTRACT_ADDRESS } });
  }
}
