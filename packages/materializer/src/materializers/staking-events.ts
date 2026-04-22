import { BaseMaterializer, EventCursor } from './base.js';
import { ponderDb } from '../db/ponder.js';
import { prisma } from '../db/prisma.js';
import { stakedWithProvider, providerQueueDripped } from '@dashtec/indexer-ponder/ponder.schema';
import { sql, asc } from 'drizzle-orm';
import { config } from '../config.js';

/** Materializes StakedWithProvider events from Ponder to Prisma. */
export class StakedWithProviderMaterializer extends BaseMaterializer {
  constructor() {
    super('staked_with_provider');
  }

  protected async fetchBatch(cursor: EventCursor) {
    return ponderDb
      .select()
      .from(stakedWithProvider)
      .where(this.buildCursorCondition(
        sql`${stakedWithProvider.block_number}`,
        sql`${stakedWithProvider.log_index}`,
        cursor
      ))
      .orderBy(
        asc(sql`${stakedWithProvider.block_number}::bigint`),
        asc(sql`${stakedWithProvider.log_index}::bigint`)
      )
      .limit(this.batchSize);
  }

  protected async materializeBatch(rows: (typeof stakedWithProvider.$inferSelect)[]) {
    for (const row of rows) {
      await prisma.stakedWithProvider.upsert({
        where: {
          txHash_logIndex: {
            txHash: row.transaction_hash,
            logIndex: parseInt(row.log_index),
          },
        },
        create: {
          providerIdentifier: row.provider_identifier,
          rollupAddress: row.rollup_address,
          attesterAddress: row.attester_address,
          coinbaseSplitContractAddress: row.coinbase_split_contract_address,
          stakerAddress: row.staker_address,
          blockNumber: BigInt(row.block_number),
          txHash: row.transaction_hash,
          logIndex: parseInt(row.log_index),
          timestamp: row.timestamp ?? 0n,
        },
        update: {
          providerIdentifier: row.provider_identifier,
          rollupAddress: row.rollup_address,
          attesterAddress: row.attester_address,
          coinbaseSplitContractAddress: row.coinbase_split_contract_address,
          stakerAddress: row.staker_address,
          blockNumber: BigInt(row.block_number),
          timestamp: row.timestamp ?? 0n,
        },
      });
    }
  }

  protected extractCursor(row: typeof stakedWithProvider.$inferSelect): EventCursor {
    return { blockNumber: row.block_number, logIndex: row.log_index };
  }

  protected async deleteAfterBlock(blockNumber: string) {
    await prisma.stakedWithProvider.deleteMany({
      where: { blockNumber: { gt: BigInt(blockNumber) } },
    });
  }

  protected async countRemaining() {
    return prisma.stakedWithProvider.count({ where: { rollupAddress: config.ROLLUP_CONTRACT_ADDRESS } });
  }
}

/** Materializes ProviderQueueDripped events from Ponder to Prisma. */
export class ProviderQueueDripMaterializer extends BaseMaterializer {
  constructor() {
    super('provider_queue_drip');
  }

  protected async fetchBatch(cursor: EventCursor) {
    return ponderDb
      .select()
      .from(providerQueueDripped)
      .where(this.buildCursorCondition(
        sql`${providerQueueDripped.block_number}`,
        sql`${providerQueueDripped.log_index}`,
        cursor
      ))
      .orderBy(
        asc(sql`${providerQueueDripped.block_number}::bigint`),
        asc(sql`${providerQueueDripped.log_index}::bigint`)
      )
      .limit(this.batchSize);
  }

  protected async materializeBatch(rows: (typeof providerQueueDripped.$inferSelect)[]) {
    for (const row of rows) {
      await prisma.providerQueueDrip.upsert({
        where: {
          txHash_logIndex: {
            txHash: row.transaction_hash,
            logIndex: parseInt(row.log_index),
          },
        },
        create: {
          providerIdentifier: row.provider_identifier,
          attesterAddress: row.attester_address,
          rollup_address: row.rollup_address,
          blockNumber: BigInt(row.block_number),
          txHash: row.transaction_hash,
          logIndex: parseInt(row.log_index),
          timestamp: row.timestamp ?? 0n,
        },
        update: {
          providerIdentifier: row.provider_identifier,
          attesterAddress: row.attester_address,
          rollup_address: row.rollup_address,
          blockNumber: BigInt(row.block_number),
          timestamp: row.timestamp ?? 0n,
        },
      });
    }
  }

  protected extractCursor(row: typeof providerQueueDripped.$inferSelect): EventCursor {
    return { blockNumber: row.block_number, logIndex: row.log_index };
  }

  protected async deleteAfterBlock(blockNumber: string) {
    await prisma.providerQueueDrip.deleteMany({
      where: { blockNumber: { gt: BigInt(blockNumber) } },
    });
  }

  protected async countRemaining() {
    return prisma.providerQueueDrip.count({ where: { rollup_address: config.ROLLUP_CONTRACT_ADDRESS } });
  }
}
